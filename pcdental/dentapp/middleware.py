import os


class SecurityHeadersMiddleware:
    """Attach baseline security headers, including a strict CSP for API responses."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.csp_policy = os.getenv(
            'CSP_POLICY',
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
        )

    def __call__(self, request):
        response = self.get_response(request)
        if self.csp_policy:
            response['Content-Security-Policy'] = self.csp_policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response
