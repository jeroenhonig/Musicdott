import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, ExternalLink } from "lucide-react";

interface PdfEmbedProps {
  pdfData?: {
    url: string;
    filename: string;
    title?: string;
  };
  editable?: boolean;
  onPdfChange?: (data: { url: string; filename: string; title?: string }) => void;
}

const PdfEmbed: React.FC<PdfEmbedProps> = ({ 
  pdfData, 
  editable = false, 
  onPdfChange 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(pdfData?.title || '');
  const [filename, setFilename] = useState(pdfData?.filename || '');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      // Create a URL for the uploaded file
      const url = URL.createObjectURL(file);
      const newData = {
        url,
        filename: file.name,
        title: title || file.name.replace('.pdf', '')
      };
      
      onPdfChange?.(newData);
      setFilename(file.name);
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    if (pdfData && onPdfChange) {
      onPdfChange({
        ...pdfData,
        title: title || filename
      });
    }
    setIsEditing(false);
  };

  if (editable && isEditing) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="font-medium">PDF Document</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="pdf-upload">Upload PDF File</Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>
            
            {filename && (
              <div>
                <Label htmlFor="pdf-title">Display Title</Label>
                <Input
                  id="pdf-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={filename.replace('.pdf', '')}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!filename}>
              Save PDF
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pdfData?.url) {
    if (editable) {
      return (
        <Card className="w-full border-dashed">
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No PDF uploaded yet</p>
            <Button onClick={() => setIsEditing(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </Button>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div>
              <h3 className="font-medium">{pdfData.title || pdfData.filename}</h3>
              <p className="text-sm text-muted-foreground">{pdfData.filename}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(pdfData.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Screen
            </Button>
            {editable && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="w-full h-[600px] border rounded-lg overflow-hidden">
          <iframe
            src={pdfData.url}
            width="100%"
            height="100%"
            title={pdfData.title || pdfData.filename}
            className="border-0"
          />
        </div>
        
        {/* Fallback message if iframe doesn't load */}
        <div className="mt-2 text-center">
          <p className="text-sm text-muted-foreground">
            If the PDF doesn't display properly, try opening it in a new tab
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PdfEmbed;