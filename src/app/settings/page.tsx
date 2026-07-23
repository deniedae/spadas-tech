"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { User, Shield, Info, MessageSquare } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    loadUser();
  }, []);

  async function resetPassword() {
    if (!user?.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password reset email sent!");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-8">

     <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-4xl font-bold">
        ⚙️ Settings
      </h1>

      <p className="mt-2 text-blue-100">
        Manage your account, security and application preferences.
      </p>
    </div>

    <div className="hidden rounded-2xl bg-white/10 p-6 backdrop-blur md:block">
      <div className="text-sm text-blue-100">
        Version
      </div>

      <div className="text-2xl font-bold">
        Beta v0.9
      </div>
    </div>
  </div>
</div>

      {/* Account */}
<div className="rounded-2xl border bg-white p-6 shadow-md transition hover:shadow-lg">
      <div className="flex items-center gap-2 mb-6">
  <User size={22} />
  <h2 className="text-xl font-semibold">
    Account
  </h2>
</div>

<div className="grid gap-6 md:grid-cols-2">

  <div>
    <p className="text-sm text-gray-500">
      Email
    </p>

    <p className="font-medium">
      {user?.email}
    </p>
  </div>

  <div>
    <p className="text-sm text-gray-500">
      Account Status
    </p>

    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
      Active
    </span>
  </div>

  <div>
    <p className="text-sm text-gray-500">
      Plan
    </p>

    <p className="font-medium">
      Free Beta
    </p>
  </div>

</div>
</div>
      {/* Security */}

      <div className="rounded-2xl border bg-white p-6 shadow-md transition hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} />
          <h2 className="text-xl font-semibold">Security</h2>
        </div>
<p className="mt-1 text-sm text-gray-500">
  Manage your password and account security.
</p>
   <div className="mt-6 flex flex-wrap gap-3">

<button
  onClick={resetPassword}
  className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
>
  🔑 Change Password
</button>

<button
  onClick={logout}
  className="rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white transition hover:bg-red-700"
>
  🚪 Log Out
</button>

</div>
      </div>
<div className="rounded-2xl border bg-white p-6 shadow-md transition hover:shadow-lg">
<div className="flex items-center gap-2 mb-4">
  <h2 className="text-xl font-semibold">
    🎨 Preferences
  </h2>
</div>

<p className="text-gray-600">
Customize how Spadas AI works for you.
</p>

<div className="mt-5 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
Coming Soon
</div>

</div>
      {/* Feedback */}

    <div className="rounded-2xl border bg-white p-6 shadow-md transition hover:shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={20} />
          <h2 className="text-xl font-semibold">Feedback</h2>
        </div>
<p className="mt-1 text-sm text-gray-500">
  Report bugs or suggest new features.
</p>
        <p className="text-gray-600">
  Help improve Spadas AI by reporting bugs or suggesting new features.
</p>

      <button className="mt-5 rounded-xl bg-black px-5 py-2.5 font-medium text-white transition hover:bg-gray-800">
  💬 Send Feedback
</button>
      </div>

      {/* About */}

    <p className="font-bold text-lg">
  Spadas AI
</p>

<p className="text-gray-500">
  Version v0.9 Beta
</p>

<div className="mt-5 space-y-2 text-gray-700">

<p>✅ Inventory Management</p>

<p>✅ Profit Tracking</p>

<p>✅ Analytics Dashboard</p>

<p>🤖 AI Listing Generator (Coming Soon)</p>

</div>

    </div>
  );
}