from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Dentist, Patient


class AuthFlowIntegrationTests(APITestCase):
	def test_dentist_signup_creates_user_and_profile(self):
		payload = {
			'username': 'dentist_signup_test',
			'email': 'dentist_signup_test@example.com',
			'password': 'StrongPass123',
			'full_name': 'Dentist Signup Test',
			'location': 'Casablanca',
			'contact_number': '0600001001',
		}

		response = self.client.post('/dentists/register/', payload, format='json')

		self.assertEqual(response.status_code, 201)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)
		self.assertTrue(response.data['is_dentist'])

		user = get_user_model().objects.get(username=payload['username'])
		self.assertEqual(user.email, payload['email'])
		self.assertTrue(Dentist.objects.filter(dentist=user).exists())

	def test_patient_signup_creates_user_and_profile(self):
		payload = {
			'username': 'patient_signup_test',
			'email': 'patient_signup_test@example.com',
			'password': 'StrongPass123',
			'full_name': 'Patient Signup Test',
			'date_of_birth': '1994-07-21',
			'contact_number': '0600001002',
			'address': '123 Signup Street',
		}

		response = self.client.post('/patients/register/', payload, format='json')

		self.assertEqual(response.status_code, 201)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)
		self.assertFalse(response.data['is_dentist'])

		user = get_user_model().objects.get(username=payload['username'])
		self.assertEqual(user.email, payload['email'])
		self.assertTrue(Patient.objects.filter(patient=user).exists())

	def test_login_allows_dentist_by_username_and_email(self):
		signup_payload = {
			'username': 'dentist_login_test',
			'email': 'dentist_login_test@example.com',
			'password': 'StrongPass123',
			'full_name': 'Dentist Login Test',
			'location': 'Rabat',
			'contact_number': '0600001003',
		}
		self.client.post('/dentists/register/', signup_payload, format='json')

		by_username = self.client.post(
			'/login/',
			{'username': signup_payload['username'], 'password': signup_payload['password']},
			format='json',
		)
		by_email = self.client.post(
			'/login/',
			{'username': signup_payload['email'], 'password': signup_payload['password']},
			format='json',
		)

		self.assertEqual(by_username.status_code, 200)
		self.assertEqual(by_email.status_code, 200)
		self.assertTrue(by_username.data['is_dentist'])
		self.assertTrue(by_email.data['is_dentist'])
