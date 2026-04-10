"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { AppLayout } from "@/components/layout";
import { Header } from "@/components/layout";
import { Button, Input } from "@/components/ui";

export default function ProfilePage() {
  const [companyName, setCompanyName] = useState("TraveX");
  const [logoUrl, setLogoUrl] = useState("/Serendia.png");
  const [tempCompanyName, setTempCompanyName] = useState("TraveX");
  const [tempLogoUrl, setTempLogoUrl] = useState("/Serendia.png");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedCompanyName = localStorage.getItem("companyName");
    const savedLogoUrl = localStorage.getItem("logoUrl");
    if (savedCompanyName) {
      setCompanyName(savedCompanyName);
      setTempCompanyName(savedCompanyName);
    }
    if (savedLogoUrl) {
      setLogoUrl(savedLogoUrl);
      setTempLogoUrl(savedLogoUrl);
    }
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setTempLogoUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaving(true);

    // Save to localStorage
    localStorage.setItem("companyName", tempCompanyName);
    localStorage.setItem("logoUrl", tempLogoUrl);

    // Update state
    setCompanyName(tempCompanyName);
    setLogoUrl(tempLogoUrl);

    // Trigger event for sidebar to update
    window.dispatchEvent(new Event("companySettingsUpdated"));

    setSaving(false);
    setSaved(true);

    // No redirect needed - user stays on profile page
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  const handleCancel = () => {
    setTempCompanyName(companyName);
    setTempLogoUrl(logoUrl);
  };

  const hasChanges = tempCompanyName !== companyName || tempLogoUrl !== logoUrl;

  return (
    <AppLayout>
      <Header
        title="Profile Settings"
        subtitle="Customize your company branding"
      />

      <div className="max-w-2xl space-y-6">
        {/* Company Name */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">
            Company Name
          </h3>
          <Input
            type="text"
            label="Company Name"
            value={tempCompanyName}
            onChange={(e) => setTempCompanyName(e.target.value)}
            placeholder="Enter your company name"
          />
        </div>

        {/* Logo */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">
            Company Logo
          </h3>

          <div className="space-y-4">
            {/* Current Logo Preview */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Current Logo
              </label>
              <div className="relative w-full h-32 bg-surface-100 rounded-lg border border-surface-300 overflow-hidden">
                <Image
                  src={tempLogoUrl}
                  alt="Logo Preview"
                  fill
                  className="object-contain p-4"
                  unoptimized={tempLogoUrl.startsWith("data:")}
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Upload New Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="w-full px-4 py-3 border border-surface-300 rounded-lg text-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700 cursor-pointer"
              />
              <p className="mt-2 text-xs text-surface-500">
                Recommended: PNG or SVG format, max 5MB. The logo will be displayed in the sidebar.
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">
            Preview
          </h3>
          <div className="bg-surface-900 rounded-lg p-4">
            <div className="flex h-20 items-center gap-3">
              <div className="relative flex-1 h-full">
                <Image
                  src={tempLogoUrl}
                  alt={`${tempCompanyName} Logo`}
                  fill
                  className="object-contain p-2"
                  unoptimized={tempLogoUrl.startsWith("data:")}
                />
              </div>
              <h1 className="text-white text-xl font-bold tracking-tight text-left flex-[2]">
                {tempCompanyName}
              </h1>
            </div>
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            loading={saving}
          >
            Save Changes
          </Button>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={!hasChanges || saving}
          >
            Cancel
          </Button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">
              ✓ Settings saved successfully!
            </span>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
