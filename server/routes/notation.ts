/**
 * Collaborative Notation API Routes
 */

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { storage } from "../storage-wrapper";
import { 
  insertNotationDocumentSchema,
  insertNotationCollaboratorSchema,
  insertNotationCommentSchema,
} from "@shared/notation-schema";

const router = Router();

// Get all notation documents for user
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    // Get documents owned by user or where user is collaborator
    const documents = await getNotationDocumentsForUser(userId);
    
    res.json({ documents });
  } catch (error) {
    console.error("Error fetching notation documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Get specific notation document
router.get("/:documentId", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = (req.user as any).id;
    
    // Check if user has access to document
    const hasAccess = await checkDocumentAccess(documentId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const document = await getNotationDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Get collaborators
    const collaborators = await getDocumentCollaborators(documentId);
    
    res.json({ document, collaborators });
  } catch (error) {
    console.error("Error fetching notation document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// Create new notation document
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const user = req.user as any;
    
    const createDocumentSchema = insertNotationDocumentSchema.extend({
      title: z.string().min(1, "Title is required"),
    });
    
    const validatedData = createDocumentSchema.parse({
      ...req.body,
      ownerId: userId,
      schoolId: user.schoolId || 1, // Default school
    });
    
    const documentId = await createNotationDocument(validatedData);
    
    // Add owner as admin collaborator
    await addCollaborator(documentId, userId, "admin", userId);
    
    res.status(201).json({ 
      documentId,
      message: "Notation document created successfully" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    console.error("Error creating notation document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// Update notation document
router.put("/:documentId", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = (req.user as any).id;
    
    // Check if user has edit permission
    const hasEditAccess = await checkDocumentEditAccess(documentId, userId);
    if (!hasEditAccess) {
      return res.status(403).json({ error: "Edit access denied" });
    }
    
    const updateData = {
      ...req.body,
      lastEditedBy: userId,
      updatedAt: new Date(),
    };
    
    await updateNotationDocument(documentId, updateData);
    
    res.json({ message: "Document updated successfully" });
  } catch (error) {
    console.error("Error updating notation document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// Add collaborator to document
router.post("/:documentId/collaborators", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = (req.user as any).id;
    
    // Check if user is owner or admin
    const isOwnerOrAdmin = await checkDocumentOwnership(documentId, userId);
    if (!isOwnerOrAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const addCollaboratorSchema = z.object({
      userId: z.number(),
      permission: z.enum(["view", "comment", "edit", "admin"]),
    });
    
    const { userId: collaboratorId, permission } = addCollaboratorSchema.parse(req.body);
    
    await addCollaborator(documentId, collaboratorId, permission, userId);
    
    res.json({ message: "Collaborator added successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    console.error("Error adding collaborator:", error);
    res.status(500).json({ error: "Failed to add collaborator" });
  }
});

// Get document history/versions
router.get("/:documentId/history", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = (req.user as any).id;
    
    const hasAccess = await checkDocumentAccess(documentId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const versions = await getDocumentVersions(documentId);
    
    res.json({ versions });
  } catch (error) {
    console.error("Error fetching document history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Add comment to document
router.post("/:documentId/comments", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = (req.user as any).id;
    
    const hasCommentAccess = await checkDocumentCommentAccess(documentId, userId);
    if (!hasCommentAccess) {
      return res.status(403).json({ error: "Comment access denied" });
    }
    
    const commentSchema = insertNotationCommentSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true 
    });
    
    const validatedData = commentSchema.parse({
      ...req.body,
      documentId,
      userId,
    });
    
    const commentId = await addComment(validatedData);
    
    res.status(201).json({ 
      commentId,
      message: "Comment added successfully" 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Helper functions (these would typically be in a service layer)
async function getNotationDocumentsForUser(userId: number): Promise<any[]> {
  // Mock implementation - would query actual database
  return [
    {
      id: "doc1",
      title: "Collaborative Symphony",
      description: "A collaborative orchestral piece",
      ownerId: userId,
      createdAt: new Date(),
      collaborators: 3,
    }
  ];
}

async function getNotationDocument(documentId: string): Promise<any> {
  // Mock implementation
  return {
    id: documentId,
    title: "Collaborative Score",
    description: "A collaborative musical score",
    notationData: {
      measures: [
        [
          { keys: ["c/4"], duration: "q" },
          { keys: ["d/4"], duration: "q" },
          { keys: ["e/4"], duration: "q" },
          { keys: ["f/4"], duration: "q" },
        ]
      ]
    },
    timeSignature: "4/4",
    keySignature: "C",
    tempo: 120,
    version: 1,
  };
}

async function createNotationDocument(data: any): Promise<string> {
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // Save to database
  console.log("Creating notation document:", documentId);
  return documentId;
}

async function updateNotationDocument(documentId: string, data: any): Promise<void> {
  console.log("Updating notation document:", documentId);
}

async function getDocumentCollaborators(documentId: string): Promise<any[]> {
  return [
    {
      userId: 1,
      username: "John Teacher",
      permission: "admin",
      isActive: true,
      lastActiveAt: new Date(),
    }
  ];
}

async function addCollaborator(
  documentId: string, 
  userId: number, 
  permission: string, 
  invitedBy: number
): Promise<void> {
  console.log(`Adding collaborator ${userId} to document ${documentId}`);
}

async function checkDocumentAccess(documentId: string, userId: number): Promise<boolean> {
  // Check if user has any access to document
  return true; // Mock - always allow for now
}

async function checkDocumentEditAccess(documentId: string, userId: number): Promise<boolean> {
  // Check if user has edit permission
  return true; // Mock
}

async function checkDocumentOwnership(documentId: string, userId: number): Promise<boolean> {
  // Check if user is owner or admin
  return true; // Mock
}

async function checkDocumentCommentAccess(documentId: string, userId: number): Promise<boolean> {
  // Check if user can comment
  return true; // Mock
}

async function getDocumentVersions(documentId: string): Promise<any[]> {
  return [
    {
      version: 1,
      createdBy: 1,
      createdAt: new Date(),
      changeDescription: "Initial version",
    }
  ];
}

async function addComment(data: any): Promise<number> {
  const commentId = Math.floor(Math.random() * 1000);
  console.log("Adding comment:", commentId);
  return commentId;
}

export default router;