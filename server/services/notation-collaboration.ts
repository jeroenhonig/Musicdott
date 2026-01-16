/**
 * Real-time Collaborative Notation Service
 * Handles operational transform and conflict resolution
 */

// WebSocketManager will be passed as parameter
import { storage } from "../storage-wrapper";
import type { 
  NotationOperation, 
  NotationDocument, 
  NotationCollaborator,
  NotationOTOperation 
} from "@shared/notation-schema";

export interface CollaborativeSession {
  documentId: string;
  collaborators: Map<number, {
    userId: number;
    username: string;
    permission: string;
    cursorPosition?: any;
    lastSeen: Date;
  }>;
  operations: NotationOTOperation[];
  currentVersion: number;
}

export class NotationCollaborationService {
  private sessions = new Map<string, CollaborativeSession>();
  private wsManager: any;

  constructor(wsManager: any) {
    this.wsManager = wsManager;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wsManager.on("notation:join", async (ws, data) => {
      const { documentId, userId } = data;
      await this.handleUserJoin(ws, documentId, userId);
    });

    this.wsManager.on("notation:leave", async (ws, data) => {
      const { documentId, userId } = data;
      await this.handleUserLeave(documentId, userId);
    });

    this.wsManager.on("notation:operation", async (ws, data) => {
      const { documentId, operation } = data;
      await this.handleOperation(documentId, operation);
    });

    this.wsManager.on("notation:cursor", async (ws, data) => {
      const { documentId, userId, position } = data;
      await this.handleCursorUpdate(documentId, userId, position);
    });
  }

  async handleUserJoin(ws: any, documentId: string, userId: number) {
    try {
      // Verify user has access to document
      const collaborator = await this.getOrCreateCollaborator(documentId, userId);
      if (!collaborator) {
        ws.emit("notation:error", { error: "Access denied" });
        return;
      }

      // Get or create session
      if (!this.sessions.has(documentId)) {
        await this.initializeSession(documentId);
      }

      const session = this.sessions.get(documentId)!;
      const user = await storage.getUser(userId);
      
      // Add user to session
      session.collaborators.set(userId, {
        userId,
        username: user?.username || `User ${userId}`,
        permission: collaborator.permission,
        lastSeen: new Date(),
      });

      // Join WebSocket room
      ws.join(`notation:${documentId}`);

      // Send current state to new user
      ws.emit("notation:state", {
        documentId,
        document: await this.getDocument(documentId),
        collaborators: Array.from(session.collaborators.values()),
        version: session.currentVersion,
      });

      // Notify other collaborators
      ws.to(`notation:${documentId}`).emit("notation:user_joined", {
        userId,
        username: user?.username || `User ${userId}`,
        permission: collaborator.permission,
      });

      console.log(`User ${userId} joined notation document ${documentId}`);
    } catch (error) {
      console.error("Error handling user join:", error);
      ws.emit("notation:error", { error: "Failed to join session" });
    }
  }

  async handleUserLeave(documentId: string, userId: number) {
    const session = this.sessions.get(documentId);
    if (!session) return;

    // Remove user from session
    const user = session.collaborators.get(userId);
    session.collaborators.delete(userId);

    // Notify other collaborators
    this.wsManager.io.to(`notation:${documentId}`).emit("notation:user_left", {
      userId,
      username: user?.username,
    });

    // Clean up empty sessions
    if (session.collaborators.size === 0) {
      this.sessions.delete(documentId);
      console.log(`Cleaned up empty session for document ${documentId}`);
    }
  }

  async handleOperation(documentId: string, operation: NotationOTOperation) {
    const session = this.sessions.get(documentId);
    if (!session) return;

    try {
      // Apply operational transform
      const transformedOperation = await this.transformOperation(session, operation);
      
      // Apply operation to document
      await this.applyOperation(documentId, transformedOperation);
      
      // Update session
      session.operations.push(transformedOperation);
      session.currentVersion++;

      // Broadcast to all collaborators except sender
      this.wsManager.io.to(`notation:${documentId}`).emit("notation:operation_applied", {
        operation: transformedOperation,
        version: session.currentVersion,
      });

      // Persist operation for history
      await this.persistOperation(documentId, transformedOperation);

    } catch (error) {
      console.error("Error handling operation:", error);
      // Send error back to sender
    }
  }

  async handleCursorUpdate(documentId: string, userId: number, position: any) {
    const session = this.sessions.get(documentId);
    if (!session) return;

    const collaborator = session.collaborators.get(userId);
    if (collaborator) {
      collaborator.cursorPosition = position;
      collaborator.lastSeen = new Date();

      // Broadcast cursor position to other collaborators
      this.wsManager.io.to(`notation:${documentId}`).emit("notation:cursor_update", {
        userId,
        username: collaborator.username,
        position,
      });
    }
  }

  private async initializeSession(documentId: string): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) throw new Error("Document not found");

    this.sessions.set(documentId, {
      documentId,
      collaborators: new Map(),
      operations: [],
      currentVersion: document.version,
    });
  }

  private async transformOperation(
    session: CollaborativeSession, 
    operation: NotationOTOperation
  ): Promise<NotationOTOperation> {
    // Implement operational transform logic
    // This is a simplified version - real implementation would be more complex
    
    const conflictingOps = session.operations.filter(op => 
      this.operationsConflict(operation, op)
    );

    if (conflictingOps.length === 0) {
      return operation; // No conflicts
    }

    // Transform against conflicting operations
    let transformedOp = operation;
    for (const conflictOp of conflictingOps) {
      transformedOp = this.resolveConflict(transformedOp, conflictOp);
    }

    return transformedOp;
  }

  private operationsConflict(op1: NotationOTOperation, op2: NotationOTOperation): boolean {
    // Check if operations affect the same position
    return (
      op1.position.measure === op2.position.measure &&
      Math.abs(op1.position.beat - op2.position.beat) < 0.5 && // Within half beat
      Math.abs(op1.timestamp - op2.timestamp) < 1000 // Within 1 second
    );
  }

  private resolveConflict(
    op1: NotationOTOperation, 
    op2: NotationOTOperation
  ): NotationOTOperation {
    // Simple conflict resolution: later timestamp wins
    // In production, this would be more sophisticated
    
    if (op1.timestamp > op2.timestamp) {
      return op1;
    }

    // Adjust position if needed
    if (op2.type === "insert") {
      return {
        ...op1,
        position: {
          ...op1.position,
          beat: op1.position.beat + 0.1, // Slight offset
        }
      };
    }

    return op1;
  }

  private async applyOperation(documentId: string, operation: NotationOTOperation): Promise<void> {
    // Apply the operation to the actual notation document
    // This would update the document's notation data based on the operation
    console.log(`Applying operation ${operation.type} to document ${documentId}`);
    
    // Update document version
    await this.incrementDocumentVersion(documentId);
  }

  private async persistOperation(documentId: string, operation: NotationOTOperation): Promise<void> {
    // Save operation to database for history/audit trail
    console.log(`Persisting operation for document ${documentId}`);
  }

  private async getDocument(documentId: string): Promise<NotationDocument | null> {
    // This would use the actual storage service
    // For now, return a mock document
    return {
      id: documentId,
      title: "Collaborative Score",
      description: "A collaborative musical score",
      ownerId: 1,
      schoolId: 1,
      notationData: {},
      notationFormat: "vexflow",
      timeSignature: "4/4",
      keySignature: "C",
      tempo: 120,
      instruments: ["piano"],
      isPublic: false,
      allowComments: true,
      version: 1,
      lastEditedBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as NotationDocument;
  }

  private async getOrCreateCollaborator(
    documentId: string, 
    userId: number
  ): Promise<{ permission: string } | null> {
    // Check if user has access to document
    // For now, allow all authenticated users
    return { permission: "edit" };
  }

  private async incrementDocumentVersion(documentId: string): Promise<void> {
    // Increment document version in database
    console.log(`Incrementing version for document ${documentId}`);
  }

  // Public methods for external use
  async createDocument(data: any): Promise<string> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Create document in database
    return documentId;
  }

  async inviteCollaborator(documentId: string, userId: number, permission: string): Promise<void> {
    // Add collaborator to document
    console.log(`Inviting user ${userId} to document ${documentId} with ${permission} permission`);
  }

  getActiveCollaborators(documentId: string): any[] {
    const session = this.sessions.get(documentId);
    return session ? Array.from(session.collaborators.values()) : [];
  }

  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      totalCollaborators: Array.from(this.sessions.values())
        .reduce((sum, session) => sum + session.collaborators.size, 0),
    };
  }
}

// Export is already at class declaration