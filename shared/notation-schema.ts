/**
 * Real-time Collaborative Notation Editor Schema
 */

import { pgTable, text, integer, timestamp, jsonb, boolean, uuid, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Notation Documents
export const notationDocuments = pgTable("notation_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull(),
  schoolId: integer("school_id").notNull(),
  
  // Notation data (MusicXML or VexFlow JSON)
  notationData: jsonb("notation_data").notNull().default('{}'),
  notationFormat: text("notation_format").notNull().default("vexflow"), // "vexflow", "musicxml", "abc"
  
  // Metadata
  timeSignature: text("time_signature").default("4/4"),
  keySignature: text("key_signature").default("C"),
  tempo: integer("tempo").default(120),
  instruments: text("instruments").array().default(["piano"]),
  
  // Collaboration settings
  isPublic: boolean("is_public").default(false),
  allowComments: boolean("allow_comments").default(true),
  
  // Versioning
  version: integer("version").notNull().default(1),
  lastEditedBy: integer("last_edited_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Real-time operations for collaborative editing
export const notationOperations = pgTable("notation_operations", {
  id: serial("id").primaryKey(),
  documentId: uuid("document_id").notNull(),
  userId: integer("user_id").notNull(),
  
  // Operation details
  operationType: text("operation_type").notNull(), // "insert", "delete", "replace", "cursor"
  operationData: jsonb("operation_data").notNull(),
  
  // Position tracking
  measureIndex: integer("measure_index"),
  noteIndex: integer("note_index"),
  
  // Operational Transform data
  transformData: jsonb("transform_data"),
  
  // Timestamps for ordering
  clientTimestamp: timestamp("client_timestamp").notNull(),
  serverTimestamp: timestamp("server_timestamp").defaultNow(),
  
  // Applied status
  isApplied: boolean("is_applied").default(false),
  conflictsWith: integer("conflicts_with").array(),
});

// Document collaborators and permissions
export const notationCollaborators = pgTable("notation_collaborators", {
  id: serial("id").primaryKey(),
  documentId: uuid("document_id").notNull(),
  userId: integer("user_id").notNull(),
  
  // Permission levels
  permission: text("permission").notNull().default("view"), // "view", "comment", "edit", "admin"
  
  // Collaboration status
  isActive: boolean("is_active").default(true),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  
  // Cursor position for real-time awareness
  cursorPosition: jsonb("cursor_position"),
  
  invitedAt: timestamp("invited_at").defaultNow(),
  invitedBy: integer("invited_by").notNull(),
});

// Comments and annotations on notation
export const notationComments = pgTable("notation_comments", {
  id: serial("id").primaryKey(),
  documentId: uuid("document_id").notNull(),
  userId: integer("user_id").notNull(),
  
  // Comment content
  content: text("content").notNull(),
  
  // Position in notation
  measureIndex: integer("measure_index").notNull(),
  noteIndex: integer("note_index"),
  position: jsonb("position"), // x, y coordinates or musical position
  
  // Thread support
  parentCommentId: integer("parent_comment_id"),
  isResolved: boolean("is_resolved").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document versions for history/rollback
export const notationVersions = pgTable("notation_versions", {
  id: serial("id").primaryKey(),
  documentId: uuid("document_id").notNull(),
  version: integer("version").notNull(),
  
  // Version data
  notationData: jsonb("notation_data").notNull(),
  changeDescription: text("change_description"),
  
  // Author info
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertNotationDocumentSchema = createInsertSchema(notationDocuments);
export const insertNotationOperationSchema = createInsertSchema(notationOperations);
export const insertNotationCollaboratorSchema = createInsertSchema(notationCollaborators);
export const insertNotationCommentSchema = createInsertSchema(notationComments);
export const insertNotationVersionSchema = createInsertSchema(notationVersions);

// Types
export type NotationDocument = typeof notationDocuments.$inferSelect;
export type InsertNotationDocument = z.infer<typeof insertNotationDocumentSchema>;

export type NotationOperation = typeof notationOperations.$inferSelect;
export type InsertNotationOperation = z.infer<typeof insertNotationOperationSchema>;

export type NotationCollaborator = typeof notationCollaborators.$inferSelect;
export type InsertNotationCollaborator = z.infer<typeof insertNotationCollaboratorSchema>;

export type NotationComment = typeof notationComments.$inferSelect;
export type InsertNotationComment = z.infer<typeof insertNotationCommentSchema>;

export type NotationVersion = typeof notationVersions.$inferSelect;
export type InsertNotationVersion = z.infer<typeof insertNotationVersionSchema>;

// Operational Transform Types
export interface NotationOTOperation {
  type: "insert" | "delete" | "replace" | "cursor";
  position: {
    measure: number;
    beat: number;
    noteIndex?: number;
  };
  data?: any;
  userId: number;
  timestamp: number;
}