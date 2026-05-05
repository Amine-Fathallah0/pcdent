import io
import logging
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)

_FIXED_REGION: dict[str, str] = {
    "maxillary_sinus": "upper_jaw",
    "mandibular_nerve": "lower_jaw",
    "periodontal_infection": "general",
    "bone_level_resorption": "general",
}

_PALETTE_COLORS = [
    (255, 99, 71), (30, 144, 255), (50, 205, 50), (255, 215, 0),
    (148, 0, 211), (255, 140, 0), (0, 206, 209), (220, 20, 60),
    (127, 255, 0), (255, 20, 147), (0, 191, 255), (255, 165, 0),
    (138, 43, 226), (0, 255, 127), (255, 69, 0), (100, 149, 237),
    (154, 205, 50),
]


def _get_color(idx: int) -> tuple[int, int, int]:
    return _PALETTE_COLORS[idx % len(_PALETTE_COLORS)]


def _infer_region(class_name: str, bbox: list[float] | None, image_height: int) -> str:
    if class_name in _FIXED_REGION:
        return _FIXED_REGION[class_name]
    if bbox and len(bbox) >= 4:
        y_centre = (bbox[1] + bbox[3]) / 2
        return "upper_jaw" if y_centre < image_height / 2 else "lower_jaw"
    return "general"


class YOLOInferenceService:
    def __init__(self, model_path: str | Path | None = None, device: str = "cpu"):
        from django.conf import settings
        self._model_path = str(model_path or settings.YOLO_MODEL_PATH)
        self._device = device
        self._model = None

    def _load(self):
        if self._model is None:
            if not Path(self._model_path).exists():
                raise FileNotFoundError(f"YOLO weights not found: {self._model_path}")
            from ultralytics import YOLO
            self._model = YOLO(self._model_path)
        return self._model

    def _extract_detections(self, result) -> list[dict]:
        """Extract structured detections from a raw YOLO result object."""
        names: dict = result.names if hasattr(result, "names") else {}
        detections: list[dict] = []

        if getattr(result, "boxes", None) is None or result.boxes is None:
            return detections

        boxes_xyxy = result.boxes.xyxy.cpu().numpy() if result.boxes.xyxy is not None else []
        confs = result.boxes.conf.cpu().numpy() if result.boxes.conf is not None else []
        cls_ids = result.boxes.cls.cpu().numpy().astype(int) if result.boxes.cls is not None else []
        img_height = result.orig_shape[0] if hasattr(result, "orig_shape") else 1

        for box, conf, cls_id in zip(boxes_xyxy, confs, cls_ids):
            x1, y1, x2, y2 = float(box[0]), float(box[1]), float(box[2]), float(box[3])
            class_name = names.get(int(cls_id), f"class_{cls_id}")
            bbox = [x1, y1, x2, y2]
            detections.append({
                "class": class_name,
                "confidence": round(float(conf), 4),
                "region": _infer_region(class_name, bbox, img_height),
                "bbox": bbox,
            })

        return detections

    def _draw_mask_overlay(self, image: Image.Image, result) -> Image.Image:
        """Pixel-level segmentation mask overlay — prettier than bounding boxes."""
        masks_np = result.masks.data.cpu().numpy()  # (N, H, W)
        num_masks, h, w = masks_np.shape

        # Match image dimensions to mask dimensions
        img = image.resize((w, h), Image.BILINEAR) if image.size != (w, h) else image
        base = np.array(img.convert("RGB"))
        overlay = base.copy()

        for i in range(num_masks):
            mask = masks_np[i] > 0.5
            overlay[mask] = _get_color(i)

        blended = (base * 0.55 + overlay * 0.45).astype(np.uint8)

        return Image.fromarray(blended)

    def infer(self, image_path: str | Path | None = None, image: Image.Image | None = None) -> list[dict]:
        model = self._load()
        source = image if image is not None else str(image_path)
        results = model.predict(source=source, verbose=False, device=self._device)
        if not results:
            return []
        return self._extract_detections(results[0])

    def infer_and_overlay(self, image: Image.Image) -> tuple[list[dict], bytes]:
        """Single YOLO pass — returns (detections, overlay_png_bytes).

        Uses pixel-level segmentation masks when the model supports them (prettier).
        Falls back to bounding-box overlay for detection-only models.
        """
        model = self._load()
        results = model.predict(source=image, verbose=False, device=self._device)
        if not results:
            return [], self.draw_overlay_to_bytes(image, [])

        result = results[0]
        detections = self._extract_detections(result)

        has_masks = (
            getattr(result, "masks", None) is not None
            and result.masks is not None
            and getattr(result.masks, "data", None) is not None
            and len(result.masks.data) > 0
        )

        overlay_img = self._draw_mask_overlay(image, result) if has_masks else self.draw_overlay(image, detections)

        buf = io.BytesIO()
        overlay_img.save(buf, format="PNG")
        return detections, buf.getvalue()

    def _generate_mask_and_label_map(self, result) -> tuple[bytes, dict[str, str]]:
        """Return (mask_png_bytes, label_map) where the mask PNG encodes instance ID in the R channel.
        The frontend reads R channel per pixel as the instance ID to colour and look up in label_map.
        """
        names: dict = result.names if hasattr(result, "names") else {}
        label_map: dict[str, str] = {}

        if getattr(result, "masks", None) is None or result.masks is None:
            buf = io.BytesIO()
            Image.new("RGBA", (1, 1)).save(buf, format="PNG")
            return buf.getvalue(), label_map

        masks_np = result.masks.data.cpu().numpy()  # (N, H, W)
        orig_h, orig_w = result.orig_shape[0], result.orig_shape[1]
        mask_array = np.zeros((orig_h, orig_w), dtype=np.uint8)

        cls_ids: list[int] = []
        if getattr(result, "boxes", None) is not None and result.boxes is not None:
            if result.boxes.cls is not None:
                cls_ids = result.boxes.cls.cpu().numpy().astype(int).tolist()

        for i, raw_mask in enumerate(masks_np):
            instance_id = i + 1  # 0 = background
            resized = np.array(
                Image.fromarray((raw_mask > 0.5).astype(np.uint8) * 255).resize(
                    (orig_w, orig_h), Image.NEAREST
                )
            ) > 127
            mask_array[resized] = instance_id
            cls_id = cls_ids[i] if i < len(cls_ids) else 0
            label_map[str(instance_id)] = names.get(cls_id, f"class_{cls_id}")

        rgba = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
        rgba[:, :, 0] = mask_array
        rgba[mask_array > 0, 3] = 255

        buf = io.BytesIO()
        Image.fromarray(rgba, "RGBA").save(buf, format="PNG")
        return buf.getvalue(), label_map

    def infer_and_overlay_with_mask(self, image: Image.Image) -> tuple[list[dict], bytes, bytes, dict[str, str]]:
        """Single YOLO pass — returns (detections, overlay_bytes, mask_bytes, label_map).

        overlay_bytes: coloured PNG for display fallback.
        mask_bytes:    RGBA PNG where R channel = instance ID (0 = background).
        label_map:     {str(instance_id): class_name} for the legend / hover tooltip.
        """
        model = self._load()
        results = model.predict(source=image, verbose=False, device=self._device)
        if not results:
            return [], self.draw_overlay_to_bytes(image, []), b"", {}

        result = results[0]
        detections = self._extract_detections(result)

        has_masks = (
            getattr(result, "masks", None) is not None
            and result.masks is not None
            and getattr(result.masks, "data", None) is not None
            and len(result.masks.data) > 0
        )

        overlay_img = self._draw_mask_overlay(image, result) if has_masks else self.draw_overlay(image, detections)
        buf = io.BytesIO()
        overlay_img.save(buf, format="PNG")
        overlay_bytes = buf.getvalue()

        if has_masks:
            mask_bytes, label_map = self._generate_mask_and_label_map(result)
        else:
            mask_bytes, label_map = b"", {}

        return detections, overlay_bytes, mask_bytes, label_map

    def draw_overlay(self, image: Image.Image, detections: list[dict]) -> Image.Image:
        overlay = image.convert("RGBA").copy()
        draw = ImageDraw.Draw(overlay)

        seen_classes: dict[str, int] = {}
        for det in detections:
            cls = det.get("class", "unknown")
            if cls not in seen_classes:
                seen_classes[cls] = len(seen_classes)
            color = _get_color(seen_classes[cls])
            bbox = det.get("bbox")

            if bbox and len(bbox) >= 4:
                x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
                draw.rectangle([x1, y1, x2, y2], outline=color + (255,), width=3)

        return Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")

    def draw_overlay_to_bytes(self, image: Image.Image, detections: list[dict]) -> bytes:
        buf = io.BytesIO()
        self.draw_overlay(image, detections).save(buf, format="PNG")
        return buf.getvalue()
