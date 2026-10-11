import React, { useState } from 'react';
import { UserPlus, AlertCircle, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CustomerCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateCustomer: (data: {
    email: string;
    displayName: string;
    company?: string;
    phone?: string;
    bio?: string;
  }) => Promise<boolean>;
  creating: boolean;
}

export function CustomerCreateDialog({
  open,
  onClose,
  onCreateCustomer,
  creating,
}: CustomerCreateDialogProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setDisplayName('');
    setCompany('');
    setPhone('');
    setBio('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Ingresá un correo electrónico válido.');
      return;
    }

    if (!displayName.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    const success = await onCreateCustomer({
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      company: company.trim() || undefined,
      phone: phone.trim() || undefined,
      bio: bio.trim() || undefined,
    });

    if (success) {
      resetForm();
      onClose();
    } else {
      setError('No se pudo crear el cliente. Verificá que el correo no esté duplicado.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md p-5 sm:p-6 border-border/80 bg-card rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UserPlus size={18} />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Registrar nuevo cliente
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Añade un cliente a la cartera comercial con sus datos de contacto y facturación.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg text-xs bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Nombre completo *
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="h-9 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Correo electrónico *
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Empresa / Obra
              </label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Particular o Empresa"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Teléfono
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="099 123 456"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Notas iniciales CRM
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Condiciones de pago, dirección o notas comerciales..."
              rows={2}
              className="w-full p-2.5 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={creating}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={creating}
              className="h-8 gap-1.5 text-xs font-medium shadow-xs"
            >
              <Save size={14} />
              <span>{creating ? 'Guardando...' : 'Crear cliente'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
