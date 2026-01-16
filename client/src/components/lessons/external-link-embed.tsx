import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Edit2, Save, X, Monitor, AlertTriangle } from "lucide-react";

interface ExternalLinkData {
  url: string;
  title: string;
  description?: string;
  embedInViewer?: boolean;
}

interface ExternalLinkEmbedProps {
  initialLinkData?: ExternalLinkData;
  onSave: (linkData: ExternalLinkData) => void;
  editable?: boolean;
}

export default function ExternalLinkEmbed({ 
  initialLinkData, 
  onSave, 
  editable = false 
}: ExternalLinkEmbedProps) {
  const [isEditing, setIsEditing] = useState(!initialLinkData?.url);
  const [url, setUrl] = useState(initialLinkData?.url || "");
  const [title, setTitle] = useState(initialLinkData?.title || "");
  const [description, setDescription] = useState(initialLinkData?.description || "");
  const [embedInViewer, setEmbedInViewer] = useState(initialLinkData?.embedInViewer || false);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check if iframe failed to load after a delay
  useEffect(() => {
    if (embedInViewer && url) {
      const timer = setTimeout(() => {
        try {
          const iframe = iframeRef.current;
          if (iframe) {
            // Check if iframe content is accessible and loaded
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc || iframeDoc.body?.children.length === 0) {
              setIframeError(true);
            }
          }
        } catch (e) {
          // Cross-origin restrictions prevent access - likely means content is blocked
          setIframeError(true);
        }
      }, 3000); // Wait 3 seconds for content to load

      return () => clearTimeout(timer);
    }
  }, [embedInViewer, url]);

  const handleSave = () => {
    if (!url || !title) return;
    
    onSave({
      url,
      title,
      description: description || undefined,
      embedInViewer
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setUrl(initialLinkData?.url || "");
    setTitle(initialLinkData?.title || "");
    setDescription(initialLinkData?.description || "");
    setEmbedInViewer(initialLinkData?.embedInViewer || false);
    setIsEditing(false);
  };

  if (isEditing && editable) {
    return (
      <Card className="border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-orange-500" />
            External Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">URL *</label>
            <Input 
              placeholder="https://example.com" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Link Title *</label>
            <Input 
              placeholder="Enter a descriptive title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Description (optional)</label>
            <Textarea 
              placeholder="Brief description of the linked resource" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="embedInViewer"
              checked={embedInViewer}
              onCheckedChange={(checked) => setEmbedInViewer(!!checked)}
            />
            <label 
              htmlFor="embedInViewer" 
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              Embed page in lesson viewer
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            When enabled, the external page will be displayed directly in the lesson viewer instead of opening in a new tab
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={!url || !title}
              size="sm"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              size="sm"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display mode
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">External Resource</span>
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mb-3">{description}</p>
            )}
            
            {embedInViewer ? (
              <div className="space-y-3">
                <div className="w-full border-2 border-orange-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="bg-orange-50 px-4 py-2 border-b border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-800">External Content</span>
                      <Button 
                        onClick={() => window.open(url, '_blank')} 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-6 px-2"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open in new tab
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <iframe
                      ref={iframeRef}
                      src={url}
                      className="w-full h-[700px] border-0"
                      title={title}
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                      referrerPolicy="no-referrer-when-downgrade"
                      onLoad={() => setIframeError(false)}
                      onError={() => setIframeError(true)}
                    />
                    
                    {iframeError && (
                      <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                        <div className="text-center p-8 max-w-md">
                          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Content Cannot Be Embedded</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            This website blocks embedding for security reasons. Click "Open in new tab" to view the content.
                          </p>
                          <Button 
                            onClick={() => window.open(url, '_blank')} 
                            variant="default" 
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View External Content
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  <span>Embedded from: {new URL(url).hostname}</span>
                  {description && (
                    <span className="block mt-1 italic">{description}</span>
                  )}
                </div>
              </div>
            ) : (
              <Button 
                asChild 
                variant="outline" 
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Resource
                </a>
              </Button>
            )}
          </div>
          
          {editable && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="ml-2"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}