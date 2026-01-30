import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Shield, Key } from "lucide-react";

export default function ProfilePage() {
  const { user, updatePassword } = useAuth();
  
  const form = useForm({
    defaultValues: {
      username: user?.username || "",
      securityAnswer: "",
      newPassword: "",
      newSecurityQuestion: user?.securityQuestion || "",
      newSecurityAnswer: ""
    }
  });

  const onSubmit = form.handleSubmit((data) => {
    updatePassword.mutate(data);
  });

  if (!user) return null;

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your encrypted identity and recovery options.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Security Question</CardTitle>
            </div>
            <CardDescription>
              This question is used to verify your identity if you forget your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm font-medium text-muted-foreground mb-1">Current Question</p>
              <p className="text-lg">{user.securityQuestion}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle>Change Credentials</CardTitle>
            </div>
            <CardDescription>
              Update your password or change your security question.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Security Answer (Required)</Label>
                  <Input 
                    {...form.register("securityAnswer")} 
                    placeholder="Prove it's you..."
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input 
                    {...form.register("newPassword")} 
                    type="password"
                    placeholder="New strong password"
                  />
                </div>
              </div>

              <div className="border-t border-border/50 my-4 pt-4">
                <p className="text-sm font-medium mb-4">Update Security Question (Optional)</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Question</Label>
                    <Input 
                      {...form.register("newSecurityQuestion")} 
                      placeholder="e.g. Favorite teacher?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Answer</Label>
                    <Input 
                      {...form.register("newSecurityAnswer")} 
                      placeholder="Answer to new question"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={updatePassword.isPending}
                >
                  {updatePassword.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
