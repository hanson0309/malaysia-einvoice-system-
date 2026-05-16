import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface WhatsAppLinkButtonProps {
  link: string;
  label?: string;
}

export default function WhatsAppLinkButton({ link, label = 'Open WhatsApp' }: WhatsAppLinkButtonProps) {
  const handleClick = () => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
        border: 'none',
        color: 'white',
        fontWeight: 600,
        fontSize: '0.875rem',
        cursor: 'pointer',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle style={{ width: '16px', height: '16px' }} />
      {label}
    </motion.button>
  );
}
