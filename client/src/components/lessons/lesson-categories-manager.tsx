import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, BookOpen, Target, Brain, Music, Zap, Star, Palette, Settings } from "lucide-react";
import type { LessonCategory } from "@shared/schema";

const AVAILABLE_ICONS = [
  { value: 'BookOpen', label: 'Book', icon: BookOpen },
  { value: 'Target', label: 'Target', icon: Target },
  { value: 'Brain', label: 'Brain', icon: Brain },
  { value: 'Music', label: 'Music', icon: Music },
  { value: 'Zap', label: 'Lightning', icon: Zap },
  { value: 'Star', label: 'Star', icon: Star },
  { value: 'Palette', label: 'Palette', icon: Palette },
  { value: 'Settings', label: 'Settings', icon: Settings },
];

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#F97316', '#06B6D4'
];

interface LessonCategoriesManagerProps {
  onCategorySelect?: (categoryId: number | null) => void;
  selectedCategoryId?: number | null;
}

export default function LessonCategoriesManager({ onCategorySelect, selectedCategoryId }: LessonCategoriesManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LessonCategory | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('BookOpen');

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/lesson-categories'],
    queryFn: async () => {
      const response = await fetch('/api/lesson-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string; icon: string }) => {
      const response = await fetch('/api/lesson-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Category created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; description?: string; color: string; icon: string }) => {
      const response = await fetch(`/api/lesson-categories/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({ title: "Success", description: "Category updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/lesson-categories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete category');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lessons'] });
      toast({ title: "Success", description: "Category deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#3B82F6');
    setIcon('BookOpen');
  };

  const handleCreateCategory = () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" });
      return;
    }
    createCategoryMutation.mutate({ name: name.trim(), description: description.trim() || undefined, color, icon });
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !name.trim()) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" });
      return;
    }
    updateCategoryMutation.mutate({ 
      id: editingCategory.id, 
      name: name.trim(), 
      description: description.trim() || undefined, 
      color, 
      icon 
    });
  };

  const handleEditCategory = (category: LessonCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setColor(category.color);
    setIcon(category.icon || 'BookOpen');
    setIsEditDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const iconObj = AVAILABLE_ICONS.find(i => i.value === iconName);
    return iconObj ? iconObj.icon : BookOpen;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-4">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lesson Categories</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="liquid-glass-modal">
            <DialogHeader>
              <DialogTitle className="text-white">Create Lesson Category</DialogTitle>
              <DialogDescription className="text-white/80">
                Create a new category to organize your lessons
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Technique, Theory, Songs"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this category"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2 mt-2">
                    {PRESET_COLORS.map((presetColor) => (
                      <button
                        key={presetColor}
                        className={`w-8 h-8 rounded-full border-2 ${
                          color === presetColor ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: presetColor }}
                        onClick={() => setColor(presetColor)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.map((iconOption) => {
                        const IconComponent = iconOption.icon;
                        return (
                          <SelectItem key={iconOption.value} value={iconOption.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {iconOption.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCategory}
                disabled={createCategoryMutation.isPending}
              >
                Create Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories grid */}
      <div className="grid gap-3">
        {/* All Lessons option */}
        <Card 
          className={`cursor-pointer transition-all ${
            selectedCategoryId === null ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
          }`}
          onClick={() => onCategorySelect?.(null)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">All Lessons</h4>
                <p className="text-sm text-gray-500">View all lessons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {categories.map((category: LessonCategory) => {
          const IconComponent = getIconComponent(category.icon || 'BookOpen');
          return (
            <Card 
              key={category.id}
              className={`liquid-glass cursor-pointer transition-all ${
                selectedCategoryId === category.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
              }`}
              onClick={() => onCategorySelect?.(category.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{category.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCategory(category);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategoryMutation.mutate(category.id);
                      }}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Technique, Theory, Songs"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <div className="flex gap-2 mt-2">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      className={`w-8 h-8 rounded-full border-2 ${
                        color === presetColor ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: presetColor }}
                      onClick={() => setColor(presetColor)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="edit-icon">Icon</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((iconOption) => {
                      const IconComponent = iconOption.icon;
                      return (
                        <SelectItem key={iconOption.value} value={iconOption.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {iconOption.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCategory}
              disabled={updateCategoryMutation.isPending}
            >
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}