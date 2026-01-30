import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Lock, ArrowRight, UserPlus, KeyRound } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

export default function AuthPage() {
  const { user, login, register, updatePassword } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col justify-center items-center p-12 relative overflow-hidden bg-muted/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background z-0" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        
        <div className="relative z-10 max-w-lg text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3 transform hover:rotate-6 transition-transform duration-500">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-display font-bold tracking-tight text-foreground">
            Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Conversations</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            End-to-end encrypted messaging for personal and group chats. 
            Your privacy is our priority.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-border/50 shadow-2xl bg-card/50 backdrop-blur-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="space-y-4 text-center pb-2">
              <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
              <CardDescription>
                Authenticate to access your encrypted vault
              </CardDescription>
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="pt-6">
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
              <TabsContent value="reset">
                <ResetForm onSuccess={() => setActiveTab("login")} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const form = useForm({
    defaultValues: { username: "", password: "" }
  });

  const onSubmit = form.handleSubmit((data) => {
    login.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input 
          id="username" 
          placeholder="Enter your username" 
          className="bg-muted/50 border-muted-foreground/20 focus:border-primary"
          {...form.register("username")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          placeholder="••••••••" 
          className="bg-muted/50 border-muted-foreground/20 focus:border-primary"
          {...form.register("password")}
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
        disabled={login.isPending}
      >
        {login.isPending ? "Decrypting..." : "Unlock Vault"}
        {!login.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { 
      username: "", 
      password: "", 
      securityQuestion: "What is your mother's maiden name?", 
      securityAnswer: "" 
    }
  });

  const onSubmit = form.handleSubmit((data) => {
    register.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-username">Username</Label>
        <Input 
          id="reg-username" 
          placeholder="Choose a username" 
          className="bg-muted/50"
          {...form.register("username")}
        />
        {form.formState.errors.username && (
          <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <Input 
          id="reg-password" 
          type="password" 
          placeholder="Choose a strong password" 
          className="bg-muted/50"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="security-q">Security Question (for recovery)</Label>
        <Input 
          id="security-q" 
          placeholder="e.g. First pet's name?" 
          className="bg-muted/50"
          {...form.register("securityQuestion")}
        />
        {form.formState.errors.securityQuestion && (
          <p className="text-xs text-destructive">{form.formState.errors.securityQuestion.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="security-a">Security Answer</Label>
        <Input 
          id="security-a" 
          type="password"
          placeholder="Your answer" 
          className="bg-muted/50"
          {...form.register("securityAnswer")}
        />
        {form.formState.errors.securityAnswer && (
          <p className="text-xs text-destructive">{form.formState.errors.securityAnswer.message}</p>
        )}
      </div>
      <Button 
        type="submit" 
        className="w-full"
        disabled={register.isPending}
      >
        {register.isPending ? "Creating Identity..." : "Create Account"}
        {!register.isPending && <UserPlus className="w-4 h-4 ml-2" />}
      </Button>
    </form>
  );
}

function ResetForm({ onSuccess }: { onSuccess: () => void }) {
  const { updatePassword } = useAuth();
  const form = useForm({
    defaultValues: { 
      username: "", 
      securityAnswer: "", 
      newPassword: "" 
    }
  });

  const onSubmit = form.handleSubmit((data) => {
    updatePassword.mutate(data, {
      onSuccess: () => onSuccess()
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-username">Username</Label>
        <Input 
          id="reset-username" 
          placeholder="Your username" 
          className="bg-muted/50"
          {...form.register("username")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-answer">Security Answer</Label>
        <Input 
          id="reset-answer" 
          placeholder="Answer to your security question" 
          className="bg-muted/50"
          {...form.register("securityAnswer")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input 
          id="new-password" 
          type="password"
          placeholder="New password" 
          className="bg-muted/50"
          {...form.register("newPassword")}
        />
      </div>
      <Button 
        type="submit" 
        variant="secondary"
        className="w-full"
        disabled={updatePassword.isPending}
      >
        {updatePassword.isPending ? "Updating..." : "Reset Password"}
        {!updatePassword.isPending && <KeyRound className="w-4 h-4 ml-2" />}
      </Button>
    </form>
  );
}
