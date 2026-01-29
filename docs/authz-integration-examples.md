# MusicDott 2.0 Authorization Middleware Integration Guide

## Overview

The authorization middleware provides comprehensive role-based access control for the multi-tenant MusicDott 2.0 school system. This guide shows how to integrate the middleware into your routes.

## Basic Setup

```typescript
import { requireAuth } from "../auth";
import { 
  loadSchoolContext, 
  requireTeacherOrOwner, 
  requireSchoolOwner,
  studentAccess,
  lessonAccess,
  applySchoolFiltering 
} from "../middleware/authz";

// Apply school context loading to all authenticated routes
app.use('/api', requireAuth, loadSchoolContext);
```

## Role-Based Route Protection

### 1. School Owner Only Routes

```typescript
// Only school owners can create new teachers
app.post('/api/teachers', 
  requireAuth, 
  loadSchoolContext, 
  requireSchoolOwner(), 
  async (req, res) => {
    // req.school.role will be 'owner' or 'platform_owner'
    // req.school.id contains the school ID
    const teacher = await storage.createUser({
      ...req.body,
      schoolId: req.school.id,
      role: 'teacher'
    });
    res.json(teacher);
  }
);

// School settings management
app.put('/api/schools/:id', 
  requireAuth, 
  loadSchoolContext, 
  requireSchoolOwner(), 
  async (req, res) => {
    const schoolId = parseInt(req.params.id);
    
    // Verify owner has access to this specific school
    if (!req.school.canAccessSchool(schoolId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const school = await storage.updateSchool(schoolId, req.body);
    res.json(school);
  }
);
```

### 2. Teacher or Owner Routes

```typescript
// Teachers and owners can view students
app.get('/api/students', 
  requireAuth, 
  loadSchoolContext, 
  requireTeacherOrOwner(), 
  applySchoolFiltering(),
  async (req, res) => {
    let students;
    
    if (req.school.isTeacher()) {
      // Teachers see only their assigned students
      students = await storage.getStudentsForTeacher(req.user.id);
    } else {
      // Owners see all students in their school(s)
      students = await storage.getStudentsBySchool(req.school.id);
    }
    
    res.json(students);
  }
);

// Create lessons (teachers and owners)
app.post('/api/lessons', 
  requireAuth, 
  loadSchoolContext, 
  requireTeacherOrOwner(), 
  async (req, res) => {
    const lesson = await storage.createLesson({
      ...req.body,
      userId: req.user.id,
      schoolId: req.school.id
    });
    res.json(lesson);
  }
);
```

### 3. Resource-Specific Access Control

```typescript
// Student profile access - owners, teachers (if assigned), students (own profile)
app.get('/api/students/:id', 
  requireAuth, 
  loadSchoolContext, 
  studentAccess({ allowOwner: true, allowTeacher: true, allowStudent: true }), 
  async (req, res) => {
    const studentId = parseInt(req.params.id);
    const student = await storage.getStudent(studentId);
    res.json(student);
  }
);

// Lesson access - more permissive for educational content
app.get('/api/lessons/:id', 
  requireAuth, 
  loadSchoolContext, 
  lessonAccess({ allowOwner: true, allowTeacher: true, allowStudent: true, checkCreator: true }), 
  async (req, res) => {
    const lessonId = parseInt(req.params.id);
    const lesson = await storage.getLesson(lessonId);
    res.json(lesson);
  }
);

// Assignment management - teachers can modify their assignments, students can view
app.put('/api/assignments/:id', 
  requireAuth, 
  loadSchoolContext, 
  assignmentAccess({ allowOwner: true, allowTeacher: true, allowStudent: false, checkCreator: true }), 
  async (req, res) => {
    const assignmentId = parseInt(req.params.id);
    const assignment = await storage.updateAssignment(assignmentId, req.body);
    res.json(assignment);
  }
);
```

### 4. Custom Authorization Logic

```typescript
// Complex authorization based on business rules
app.post('/api/students/:studentId/assignments', 
  requireAuth, 
  loadSchoolContext, 
  requireCustomAccess(async (req, res) => {
    const studentId = parseInt(req.params.studentId);
    const student = await storage.getStudent(studentId);
    
    // Teachers can only assign to their students
    if (req.school.isTeacher()) {
      return student.assignedTeacherId === req.user.id;
    }
    
    // Owners can assign to any student in their school
    if (req.school.isSchoolOwner()) {
      return req.school.canAccessSchool(student.schoolId);
    }
    
    return false;
  }), 
  async (req, res) => {
    // Create assignment logic here
  }
);
```

### 5. Platform Owner Routes

```typescript
// Platform administration - only platform owners
app.get('/api/admin/schools', 
  requireAuth, 
  loadSchoolContext, 
  requireSchoolRole('platform_owner'), 
  async (req, res) => {
    const schools = await storage.getSchools();
    res.json(schools);
  }
);

// Cross-school analytics
app.get('/api/admin/analytics', 
  requireAuth, 
  loadSchoolContext, 
  requireSchoolRole('platform_owner'), 
  async (req, res) => {
    // Platform owners can see data across all schools
    const analytics = await generateCrossSchoolAnalytics();
    res.json(analytics);
  }
);
```

## Working with School Context

### Accessing School Information

```typescript
app.get('/api/my-school-info', 
  requireAuth, 
  loadSchoolContext, 
  async (req, res) => {
    const schoolInfo = {
      schoolId: req.school.id,
      role: req.school.role,
      userId: req.school.userId,
      memberships: req.school.memberships,
      
      // Helper method results
      isPlatformOwner: req.school.isPlatformOwner(),
      isSchoolOwner: req.school.isSchoolOwner(),
      isTeacher: req.school.isTeacher(),
      isStudent: req.school.isStudent(),
      
      // Check access to specific school
      canAccessSchool123: req.school.canAccessSchool(123),
      
      // Check roles in specific schools
      isOwnerOfSchool456: req.school.isSchoolOwner(456),
      isTeacherInSchool789: req.school.isTeacher(789)
    };
    
    res.json(schoolInfo);
  }
);
```

### Multi-School Users

```typescript
// Handle users who belong to multiple schools
app.get('/api/my-schools', 
  requireAuth, 
  loadSchoolContext, 
  async (req, res) => {
    const schools = [];
    
    // Add primary school
    if (req.school.id) {
      const primarySchool = await storage.getSchool(req.school.id);
      if (primarySchool) {
        schools.push({
          ...primarySchool,
          role: req.school.role,
          isPrimary: true
        });
      }
    }
    
    // Add schools from memberships
    for (const membership of req.school.memberships) {
      if (membership.schoolId !== req.school.id) {
        const school = await storage.getSchool(membership.schoolId);
        if (school) {
          schools.push({
            ...school,
            role: membership.role,
            isPrimary: false
          });
        }
      }
    }
    
    res.json(schools);
  }
);
```

## Error Handling

The middleware provides consistent error responses:

- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User lacks required permissions
- **404 Not Found**: Resource doesn't exist
- **400 Bad Request**: Invalid request data

```typescript
// Example error responses:
{
  "message": "Authentication required"
}

{
  "message": "Insufficient permissions for this operation",
  "required": ["owner", "teacher"],
  "current": "student"
}

{
  "message": "Access denied. Resource belongs to a different school."
}
```

## Best Practices

### 1. Always Load School Context

```typescript
// ✅ Good - context loaded before authorization
app.get('/api/data', requireAuth, loadSchoolContext, requireTeacherOrOwner(), handler);

// ❌ Bad - authorization without context
app.get('/api/data', requireAuth, requireTeacherOrOwner(), handler);
```

### 2. Use Appropriate Access Levels

```typescript
// ✅ Good - specific access control
app.get('/api/students/:id', studentAccess({ allowTeacher: true, allowStudent: true }));

// ❌ Bad - overly permissive
app.get('/api/students/:id', requireAuth);
```

### 3. Validate School Ownership in Route Logic

```typescript
// ✅ Good - double-check school ownership
app.post('/api/lessons', requireTeacherOrOwner(), async (req, res) => {
  const lesson = await storage.createLesson({
    ...req.body,
    schoolId: req.school.id, // Ensure lesson belongs to user's school
    userId: req.user.id
  });
});

// ❌ Bad - trusting client data
app.post('/api/lessons', requireTeacherOrOwner(), async (req, res) => {
  const lesson = await storage.createLesson(req.body); // schoolId could be anything
});
```

### 4. Handle Platform Owners Appropriately

```typescript
// ✅ Good - explicit platform owner handling
if (req.school.isPlatformOwner()) {
  // Platform owners can access any school's data
  students = await storage.getAllStudents();
} else {
  // Regular users get school-filtered data
  students = await storage.getStudentsBySchool(req.school.id);
}
```

## Testing Your Authorization

```typescript
// Test different user roles
describe('Student API Authorization', () => {
  it('should allow teachers to view their assigned students', async () => {
    const teacher = await loginAsTeacher();
    const response = await request(app)
      .get('/api/students/123')
      .set('Authorization', `Bearer ${teacher.token}`);
    
    expect(response.status).toBe(200);
  });
  
  it('should deny teachers access to unassigned students', async () => {
    const teacher = await loginAsTeacher();
    const response = await request(app)
      .get('/api/students/456') // Not assigned to this teacher
      .set('Authorization', `Bearer ${teacher.token}`);
    
    expect(response.status).toBe(403);
  });
  
  it('should allow school owners to view all students', async () => {
    const owner = await loginAsSchoolOwner();
    const response = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${owner.token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
```

This comprehensive authorization system ensures proper multi-tenant isolation while providing appropriate access levels for different user roles.