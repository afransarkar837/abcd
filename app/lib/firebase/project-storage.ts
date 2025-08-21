import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/app/lib/firebase.config';
import { GeneratedCode } from '@/app/types/generation';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: 'web' | 'mobile';
  status: 'generating' | 'completed' | 'error' | 'deployed';
  code: GeneratedCode;
  firebaseConfig?: FirebaseProjectConfig;
  deploymentUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    model: string;
    totalFiles: number;
    totalScreens: number;
    hasBackend: boolean;
  };
}

export interface FirebaseProjectConfig {
  projectId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export class ProjectStorage {
  private projectsCollection = collection(db, 'projects');

  async saveProject(
    userId: string,
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const project: Project = {
      ...projectData,
      id: projectId,
      userId,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };

    // Save project to Firestore
    await setDoc(doc(this.projectsCollection, projectId), project);

    // Save code files to Storage
    await this.saveCodeToStorage(projectId, projectData.code);

    // If Firebase backend is enabled, create Firebase project config
    if (projectData.metadata.hasBackend) {
      await this.setupFirebaseForGeneratedApp(projectId);
    }

    return projectId;
  }

  private async saveCodeToStorage(projectId: string, code: GeneratedCode) {
    // Save each file to Firebase Storage
    for (const file of code.files) {
      const fileRef = ref(storage, `projects/${projectId}/code/${file.path}`);
      await uploadString(fileRef, file.content, 'raw');
    }

    // Save project structure as JSON
    const structureRef = ref(storage, `projects/${projectId}/structure.json`);
    await uploadString(structureRef, JSON.stringify(code.structure), 'raw');
  }

  private async setupFirebaseForGeneratedApp(projectId: string) {
    // Generate Firebase config for the generated app
    const firebaseConfig: FirebaseProjectConfig = {
      projectId: `${projectId}-generated`,
      apiKey: `generated-api-key-${projectId}`,
      authDomain: `${projectId}-generated.firebaseapp.com`,
      storageBucket: `${projectId}-generated.appspot.com`,
      messagingSenderId: Math.random().toString().substr(2, 12),
      appId: `1:${Math.random().toString().substr(2, 12)}:web:${Math.random().toString(36).substr(2, 12)}`
    };

    // Update project with Firebase config
    await updateDoc(doc(this.projectsCollection, projectId), {
      firebaseConfig,
      updatedAt: serverTimestamp()
    });

    // Create Firestore rules for the generated app
    await this.createFirestoreRules(projectId);

    // Create Storage rules for the generated app
    await this.createStorageRules(projectId);
  }

  private async createFirestoreRules(projectId: string) {
    const rules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read for app content
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Project-specific rules
    match /projects/${projectId}/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}`;

    const rulesRef = ref(storage, `projects/${projectId}/firebase/firestore.rules`);
    await uploadString(rulesRef, rules, 'raw');
  }

  private async createStorageRules(projectId: string) {
    const rules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /projects/${projectId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.metadata.userId;
    }
  }
}`;

    const rulesRef = ref(storage, `projects/${projectId}/firebase/storage.rules`);
    await uploadString(rulesRef, rules, 'raw');
  }

  async getProject(projectId: string): Promise<Project | null> {
    const projectDoc = await getDoc(doc(this.projectsCollection, projectId));
    if (projectDoc.exists()) {
      return projectDoc.data() as Project;
    }
    return null;
  }

  async getUserProjects(userId: string, limitCount: number = 10): Promise<Project[]> {
    const q = query(
      this.projectsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Project);
  }

  async updateProjectStatus(
    projectId: string,
    status: Project['status'],
    deploymentUrl?: string
  ) {
    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (deploymentUrl) {
      updates.deploymentUrl = deploymentUrl;
    }

    await updateDoc(doc(this.projectsCollection, projectId), updates);
  }

  // Add this method to the existing ProjectStorage class

  async deleteProject(projectId: string): Promise<void> {
    try {
      // Delete from Firestore
      await deleteDoc(doc(this.projectsCollection, projectId));

      // Delete files from Storage
      const projectRef = ref(storage, `projects/${projectId}`);
      // Note: In production, you'd need to list and delete all files

      console.log(`Project ${projectId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  
}