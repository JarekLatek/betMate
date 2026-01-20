import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabaseBrowser } from "@/db/supabase.browser";
import {
  loginSchema,
  registerSchema,
  type AuthMode,
  type LoginFormValues,
  type RegisterFormValues,
} from "@/lib/validation/auth.validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isRegisterMode = mode === "register";

  // Select the appropriate schema based on mode
  const schema = isRegisterMode ? registerSchema : loginSchema;

  const form = useForm<LoginFormValues | RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      ...(isRegisterMode && { username: "" }),
    },
  });

  const onSubmit = async (data: LoginFormValues | RegisterFormValues) => {
    // Prevent default form submission
    setIsLoading(true);
    setServerError(null);

    try {
      if (isRegisterMode) {
        // Registration flow - two-step process (US-001)
        const registerData = data as RegisterFormValues;

        // Step 1: Check username availability
        const checkResponse = await fetch("/api/auth/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: registerData.username }),
        });

        const checkResult = (await checkResponse.json()) as { available: boolean; message?: string };

        if (!checkResult.available) {
          setServerError(checkResult.message ?? "Nazwa użytkownika jest już zajęta");
          setIsLoading(false);
          return;
        }

        // Step 2: Create account via Supabase Auth
        const { data: authData, error } = await supabaseBrowser.auth.signUp({
          email: registerData.email,
          password: registerData.password,
          options: {
            data: {
              username: registerData.username,
            },
          },
        });

        if (error) {
          throw error;
        }

        // Successful registration
        // If email confirmation is disabled, user has a session and can go to home
        // If email confirmation is enabled, user needs to verify email first
        if (authData.session) {
          window.location.href = "/";
        } else {
          // No session means email confirmation is required
          window.location.href = "/login";
        }
      } else {
        // Login flow
        const { error } = await supabaseBrowser.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          throw error;
        }

        // Successful login - redirect to home
        window.location.href = "/";
      }
    } catch (error) {
      // Handle authentication errors
      if (error && typeof error === "object" && "message" in error) {
        const errorMessage = String(error.message);

        // Map common Supabase errors to user-friendly messages
        if (errorMessage.includes("Invalid login credentials")) {
          setServerError("Nieprawidłowy email lub hasło");
        } else if (errorMessage.includes("Email not confirmed")) {
          setServerError("Potwierdź swój adres email przed zalogowaniem");
        } else if (errorMessage.includes("User already registered")) {
          setServerError("Użytkownik z tym adresem email już istnieje");
        } else {
          setServerError("Wystąpił błąd. Spróbuj ponownie");
        }
      } else {
        setServerError("Wystąpił nieoczekiwany błąd");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="flex flex-col items-center text-center">
        <img src="/betMate.svg" alt="betMate" className="mb-4 h-12" />
        <CardTitle>{isRegisterMode ? "Rejestracja" : "Logowanie"}</CardTitle>
        <CardDescription>
          {isRegisterMode ? "Utwórz nowe konto, aby rozpocząć typowanie" : "Zaloguj się do swojego konta"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {isRegisterMode && (
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa użytkownika</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="username-input"
                        placeholder="jan_kowalski"
                        autoComplete="username"
                        {...field}
                        disabled={isLoading}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="email-input"
                      type="email"
                      placeholder="twoj@email.pl"
                      autoComplete="email"
                      {...field}
                      disabled={isLoading}
                    />
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
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="password-input"
                      type="password"
                      placeholder="••••••••"
                      autoComplete={isRegisterMode ? "new-password" : "current-password"}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isRegisterMode && (
              <div className="text-right">
                <a
                  href="/forgot-password"
                  data-testid="forgot-password-link"
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Zapomniałem hasła
                </a>
              </div>
            )}

            <Button type="submit" data-testid="submit-button" className="w-full" disabled={isLoading}>
              {isLoading ? "Ładowanie..." : isRegisterMode ? "Zarejestruj się" : "Zaloguj się"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {isRegisterMode ? "Masz już konto? " : "Nie masz konta? "}
          <a
            href={isRegisterMode ? "/login" : "/register"}
            data-testid="auth-toggle-link"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isRegisterMode ? "Zaloguj się" : "Zarejestruj się"}
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
