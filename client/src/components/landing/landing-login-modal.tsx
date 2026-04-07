// client/src/components/landing/landing-login-modal.tsx
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import FocusTrap from "@/components/accessibility/focus-trap";
import { useAuth } from "@/hooks/use-auth";
import { loginCredentialsSchema } from "@shared/auth-validation";

interface LandingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LandingLoginModal({ isOpen, onClose }: LandingLoginModalProps) {
  const { loginMutation } = useAuth();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof loginCredentialsSchema>>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginCredentialsSchema>) {
    loginMutation.mutate(
      { username: values.username, password: values.password },
      { onSuccess: onClose }
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center mb-6">
            <p id="login-modal-title" className="text-xl font-bold tracking-tight">
              Music<span className="text-primary">dott.</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Welkom terug</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gebruikersnaam</FormLabel>
                    <FormControl>
                      <Input placeholder="gebruikersnaam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wachtwoord</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {loginMutation.isError && (
                // Note: useAuth's loginMutation also fires a toast on error (existing behavior).
                // The inline message gives persistent feedback inside the modal; the toast is transient. Both are acceptable.
                <p className="text-sm text-red-600">
                  Gebruikersnaam of wachtwoord onjuist.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Inloggen
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Nog geen account?{" "}
            <button
              onClick={() => { onClose(); navigate("/signup"); }}
              className="text-primary hover:underline font-medium"
            >
              Aanmelden
            </button>
          </p>
        </div>
      </FocusTrap>
    </div>
  );
}
