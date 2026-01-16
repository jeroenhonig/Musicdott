import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Palette, Type, Code, RefreshCw, Eye, Save, Upload, Trash2, Image, Settings, User, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/layouts/app-layout";
import type { SchoolBranding } from "@shared/schema";

interface BrandingFormData extends SchoolBranding {
  [key: string]: any;
}

export default function SchoolBranding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { applyPreviewBranding, clearPreviewBranding, isPreviewMode } = useTheme();
  const [formData, setFormData] = useState<BrandingFormData>({
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    accentColor: "#10b981",
    backgroundImage: "",
    fontFamily: "Inter",
    customCss: "",
    brandingEnabled: false
  });
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Get current school branding
  const { data: branding, isLoading, error } = useQuery({
    queryKey: ['/api/schools', user?.schoolId, 'branding'],
    enabled: !!user?.schoolId
  });

  // Update branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      return apiRequest(`/api/schools/${user?.schoolId}/branding`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/schools', user?.schoolId, 'branding']
      });
      toast({
        title: "Branding Updated",
        description: "Your school branding settings have been saved successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update branding settings.",
        variant: "destructive"
      });
    }
  });

  // Reset branding mutation
  const resetBrandingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/schools/${user?.schoolId}/branding/reset`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/schools', user?.schoolId, 'branding']
      });
      toast({
        title: "Branding Reset",
        description: "Your school branding has been reset to default settings."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset branding settings.",
        variant: "destructive"
      });
    }
  });

  // Logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(`/api/schools/${user?.schoolId}/branding/logo`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload logo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentLogo(data.logoUrl);
      setLogoFile(null);
      setLogoPreview(null);
      
      queryClient.invalidateQueries({
        queryKey: ['/api/schools', user?.schoolId, 'branding']
      });
      
      toast({
        title: "Logo Uploaded",
        description: "Your school logo has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload logo.",
        variant: "destructive"
      });
    }
  });

  // Logo delete mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/schools/${user?.schoolId}/branding/logo`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete logo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setCurrentLogo(null);
      setLogoFile(null);
      setLogoPreview(null);
      
      queryClient.invalidateQueries({
        queryKey: ['/api/schools', user?.schoolId, 'branding']
      });
      
      toast({
        title: "Logo Removed",
        description: "Your school logo has been removed successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to remove logo.",
        variant: "destructive"
      });
    }
  });

  // Update form data when branding loads
  useEffect(() => {
    if (branding) {
      const brandingData = branding as SchoolBranding;
      const schoolData = branding as any; // For logo which is on school object
      
      setFormData({
        primaryColor: brandingData.primaryColor || "#3b82f6",
        secondaryColor: brandingData.secondaryColor || "#64748b",
        accentColor: brandingData.accentColor || "#10b981",
        backgroundImage: brandingData.backgroundImage || "",
        fontFamily: brandingData.fontFamily || "Inter",
        customCss: brandingData.customCss || "",
        brandingEnabled: brandingData.brandingEnabled ?? false
      });
      
      // Set current logo if it exists
      setCurrentLogo(schoolData.logo || null);
    }
  }, [branding]);

  const handleInputChange = (field: string, value: any) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    setFormData(newFormData);
    
    // Apply live preview if branding is enabled
    if (newFormData.brandingEnabled) {
      applyPreviewBranding(newFormData);
    } else {
      clearPreviewBranding();
    }
  };

  const handleSave = () => {
    clearPreviewBranding(); // Clear preview before saving
    updateBrandingMutation.mutate(formData);
  };

  const handleReset = () => {
    clearPreviewBranding(); // Clear preview before resetting
    resetBrandingMutation.mutate();
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPEG, PNG, GIF, or WebP image file.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleLogoDelete = () => {
    deleteLogoMutation.mutate();
  };

  // Check if user is school owner
  if (!user || (user.role !== 'school_owner' && user.role !== 'platform_owner')) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Access denied. Only school owners can manage branding settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-destructive">
                Failed to load branding settings. Please try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">School Branding</h1>
            <p className="text-muted-foreground">
              Customize your school's appearance and branding
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={formData.brandingEnabled ? "default" : "secondary"}>
              {formData.brandingEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Custom Branding
                </CardTitle>
                <CardDescription>
                  Enable custom branding to personalize your school's appearance
                </CardDescription>
              </div>
              <Switch
                data-testid="toggle-branding"
                checked={formData.brandingEnabled ?? false}
                onCheckedChange={(checked) => handleInputChange('brandingEnabled', checked)}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Branding Settings */}
        {formData.brandingEnabled && (
          <Tabs defaultValue="logo" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="logo">Logo</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="typography">Typography</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Logo Tab */}
            <TabsContent value="logo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    School Logo
                  </CardTitle>
                  <CardDescription>
                    Upload and manage your school's logo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Logo Display */}
                  {currentLogo && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Current Logo</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLogoDelete}
                          disabled={deleteLogoMutation.isPending}
                          data-testid="button-delete-logo"
                        >
                          <Trash2 className={`h-4 w-4 mr-2 ${deleteLogoMutation.isPending ? 'animate-spin' : ''}`} />
                          Remove
                        </Button>
                      </div>
                      <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
                        <img
                          src={currentLogo}
                          alt="School Logo"
                          className="max-h-32 max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="logo-upload">
                        {currentLogo ? 'Replace Logo' : 'Upload Logo'}
                      </Label>
                      {logoFile && (
                        <Button
                          onClick={handleLogoUpload}
                          disabled={uploadLogoMutation.isPending}
                          size="sm"
                          data-testid="button-upload-logo"
                        >
                          <Upload className={`h-4 w-4 mr-2 ${uploadLogoMutation.isPending ? 'animate-spin' : ''}`} />
                          Upload
                        </Button>
                      )}
                    </div>
                    
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleLogoFileChange}
                      className="cursor-pointer"
                      data-testid="input-logo-upload"
                    />
                    
                    {logoPreview && (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
                          <img
                            src={logoPreview}
                            alt="Logo Preview"
                            className="max-h-32 max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Supported formats: JPEG, PNG, GIF, WebP</p>
                      <p>Maximum file size: 5MB</p>
                      <p>Recommended dimensions: 200x200px (square) or 300x100px (horizontal)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Color Scheme
                  </CardTitle>
                  <CardDescription>
                    Choose colors that represent your school's brand
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary-color"
                          data-testid="input-primary-color"
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary-color"
                          data-testid="input-secondary-color"
                          type="color"
                          value={formData.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={formData.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          placeholder="#64748b"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accent-color">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accent-color"
                          data-testid="input-accent-color"
                          type="color"
                          value={formData.accentColor}
                          onChange={(e) => handleInputChange('accentColor', e.target.value)}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={formData.accentColor}
                          onChange={(e) => handleInputChange('accentColor', e.target.value)}
                          placeholder="#10b981"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Typography
                  </CardTitle>
                  <CardDescription>
                    Customize fonts and text appearance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="font-family">Font Family</Label>
                    <select
                      id="font-family"
                      data-testid="select-font-family"
                      value={formData.fontFamily || "Inter"}
                      onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="Inter">Inter (Default)</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Lato">Lato</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Source Sans Pro">Source Sans Pro</option>
                      <option value="Nunito">Nunito</option>
                    </select>
                    <p className="text-sm text-muted-foreground">
                      Choose a font that matches your school's personality
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="background-image">Background Image URL</Label>
                    <Input
                      id="background-image"
                      data-testid="input-background-image"
                      value={formData.backgroundImage || ""}
                      onChange={(e) => handleInputChange('backgroundImage', e.target.value)}
                      placeholder="https://example.com/background.jpg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Optional: Add a subtle background image for your school
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Custom CSS
                  </CardTitle>
                  <CardDescription>
                    Add custom CSS for advanced styling (use carefully)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    data-testid="textarea-custom-css"
                    value={formData.customCss}
                    onChange={(e) => handleInputChange('customCss', e.target.value)}
                    placeholder="/* Add your custom CSS here */
.school-header {
  background: linear-gradient(45deg, var(--primary), var(--secondary));
}

/* Keep it simple and safe */"
                    className="min-h-48 font-mono text-sm"
                  />
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                      ⚠️ Advanced Feature
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Custom CSS allows powerful customization but can break your site if used incorrectly. 
                      Test changes carefully and use CSS variables like <code>var(--primary)</code> when possible.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetBrandingMutation.isPending}
            data-testid="button-reset"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${resetBrandingMutation.isPending ? 'animate-spin' : ''}`} />
            Reset to Defaults
          </Button>

          <div className="flex gap-2">
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              onClick={() => isPreviewMode ? clearPreviewBranding() : handleInputChange('brandingEnabled', formData.brandingEnabled)}
              data-testid="button-preview"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPreviewMode ? "Exit Preview" : "Preview"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateBrandingMutation.isPending}
              data-testid="button-save"
            >
              <Save className={`h-4 w-4 mr-2 ${updateBrandingMutation.isPending ? 'animate-spin' : ''}`} />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}