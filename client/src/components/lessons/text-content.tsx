import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const textFormSchema = z.object({
  content: z.string().min(1, "Please enter some text")
});

type TextFormValues = z.infer<typeof textFormSchema>;

interface TextContentProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  editable?: boolean;
}

export default function TextContent({ 
  initialContent = "",
  onSave, 
  editable = false
}: TextContentProps) {
  const [content, setContent] = useState<string>(initialContent);
  const [isEditing, setIsEditing] = useState<boolean>(editable && (!initialContent || initialContent.trim() === ""));
  
  const form = useForm<TextFormValues>({
    resolver: zodResolver(textFormSchema),
    defaultValues: {
      content: initialContent
    }
  });
  
  const onSubmit = (values: TextFormValues) => {
    console.log("Text content onSubmit called with:", values);
    setContent(values.content);
    setIsEditing(false);
    if (onSave) {
      console.log("Calling onSave with text:", values.content);
      onSave(values.content);
    }
  };
  
  // Convert newlines to <br/> elements for display
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
  return (
    <div className="w-full">
      {editable && isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="text-content">Text Content</Label>
            <Textarea 
              id="text-content"
              placeholder="Enter text content for your lesson..." 
              value={form.watch('content')}
              onChange={(e) => form.setValue('content', e.target.value)}
              rows={5}
              className="resize-y mt-2"
            />
          </div>
          <div className="flex justify-end gap-2">
            {initialContent && (
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const values = form.getValues();
                console.log("Text content saving:", values.content);
                onSubmit(values);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Card className={editable ? "hover:bg-gray-50 cursor-pointer transition-colors" : ""}>
          <CardContent 
            className="p-4 prose max-w-none"
            onClick={() => editable && setIsEditing(true)}
          >
            {content ? formatText(content) : (
              <p className="text-gray-400 italic">
                {editable ? "Click to add text content" : "No content provided"}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}