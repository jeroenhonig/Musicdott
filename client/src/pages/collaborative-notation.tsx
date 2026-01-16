/**
 * Collaborative Notation Editor Page
 * Real-time music notation collaboration
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  FileMusic, 
  Users, 
  Clock,
  Search,
  Music2,
  Share,
  Edit
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import CollaborativeNotationEditor from "@/components/notation/collaborative-notation-editor";
import { useQuery } from "@tanstack/react-query";

interface NotationDocument {
  id: string;
  title: string;
  description?: string;
  collaborators: number;
  ownerId: number;
  isOwner: boolean;
  lastModified: string;
  version: number;
}

export default function CollaborativeNotationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<NotationDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [newDocumentDescription, setNewDocumentDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Removed loadDocuments call - using useQuery instead

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["/api/notation"],
    queryFn: async () => {
      const response = await fetch("/api/notation", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    }
  });

  useEffect(() => {
    if (documentsData?.documents) {
      setDocuments(documentsData.documents);
    }
  }, [documentsData]);

  const createDocument = async () => {
    if (!newDocumentTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/notation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: newDocumentTitle,
          description: newDocumentDescription,
        }),
      });

      if (!response.ok) throw new Error("Failed to create document");
      const data = await response.json();

      setNewDocumentTitle("");
      setNewDocumentDescription("");
      setShowCreateForm(false);
      
      toast({
        title: "Document Created",
        description: "New notation document created successfully",
      });

      // Open the new document
      setSelectedDocument(data.documentId);
      
    } catch (error) {
      console.error("Error creating document:", error);
      toast({
        title: "Creation Error",
        description: "Failed to create notation document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedDocument) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <Button
            variant="outline"
            onClick={() => setSelectedDocument(null)}
          >
            ← Back to Documents
          </Button>
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Collaborative Notation Editor</span>
          </div>
        </div>
        
        <div className="flex-1">
          <CollaborativeNotationEditor
            documentId={selectedDocument}
            userId={user?.id || 1}
            username={user?.username || "Unknown User"}
            onSave={(data) => {
              console.log("Saving notation data:", data);
              toast({
                title: "Saved",
                description: "Changes saved successfully",
              });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Music2 className="w-8 h-8 text-blue-600" />
            Collaborative Notation
          </h1>
          <p className="text-gray-600 mt-2">
            Create and edit musical scores in real-time with your team
          </p>
        </div>
        
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Score
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search notation documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Notation Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={newDocumentTitle}
                onChange={(e) => setNewDocumentTitle(e.target.value)}
                placeholder="Enter document title..."
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description (Optional)</label>
              <Input
                value={newDocumentDescription}
                onChange={(e) => setNewDocumentDescription(e.target.value)}
                placeholder="Enter description..."
                maxLength={500}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={createDocument} disabled={loading}>
                {loading ? "Creating..." : "Create Document"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  setNewDocumentTitle("");
                  setNewDocumentDescription("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <Card 
              key={document.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedDocument(document.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileMusic className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold truncate">{document.title}</h3>
                  </div>
                  {document.isOwner && (
                    <Badge variant="secondary">Owner</Badge>
                  )}
                </div>

                {document.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {document.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {document.collaborators}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {document.lastModified}
                    </div>
                  </div>
                  
                  <Badge variant="outline">
                    v{document.version}
                  </Badge>
                </div>

                <Separator className="my-4" />

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDocument(document.id);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.share?.({
                        title: document.title,
                        url: `${window.location.origin}/notation/${document.id}`,
                      }).catch(() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/notation/${document.id}`
                        );
                        toast({
                          title: "Link Copied",
                          description: "Share link copied to clipboard",
                        });
                      });
                    }}
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileMusic className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No notation documents found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? "Try adjusting your search terms"
                : "Create your first collaborative score to get started"
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Score
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}