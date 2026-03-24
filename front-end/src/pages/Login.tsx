import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('login/', { username, password });
      const { token, is_dentist, user_id, full_name } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('full_name', full_name);
      localStorage.setItem('user_role', is_dentist ? 'dentist' : 'patient');

      toast.success('Login successful!');

      if (is_dentist) {
        navigate('/dentist');
      } else {
        navigate('/patient');
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="landing-orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="auth-container">
        <Card className="auth-card">
          <CardHeader>
            <span className="auth-badge">Welcome back</span>
            <CardTitle className="auth-title">Sign in to your workspace</CardTitle>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="primary-cta w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <Button variant="outline" type="button" onClick={() => navigate('/')} className="w-full">
                Back to home
              </Button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="auth-link"
              >
                New here? Create an account
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
