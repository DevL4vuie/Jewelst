import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid email or password.');
    }
  };

  return (
    <div className="pos-bg flex items-center justify-center p-4" style={{ minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <Card tape="pink" className="text-center" style={{ padding: '2rem 1.5rem' }}>
          {/* Logo Brand Sticker */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--butter-soft)',
            border: '2.5px solid var(--ink)',
            boxShadow: '0 3px 0 var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            margin: '0 auto 1rem auto'
          }}>
            👡
          </div>

          <h1 className="pos-title text-2xl mb-1">Jewel's Sandals</h1>
          <p className="text-sm text-muted mb-4 font-bold">
            Inventory, Capital, Expenses & POS Management
          </p>

          {error && (
            <div style={{
              background: 'var(--coral)',
              color: 'var(--ink)',
              border: '2px solid var(--ink)',
              borderRadius: '12px',
              padding: '0.6rem',
              marginBottom: '1rem',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="text-left">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              disabled={loading}
            >
              <LogIn size={18} />
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
