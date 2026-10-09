import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { RecordService } from '../../core/services/record.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { User, CreateUserPayload } from '../../core/models/user.model';
import { VerificationRecord } from '../../core/models/record.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private recordService = inject(RecordService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  private destroy$ = new Subject<void>();
  private timerSub?: Subscription;

  // Active user data
  currentUser: User | null = null;
  isAdmin = false;

  // Tab navigation for Admin
  activeTab: 'records' | 'users' = 'records';

  // Records state
  records: VerificationRecord[] = [];
  filteredRecords: VerificationRecord[] = [];
  isRecordsLoading = false;
  recordsSearchTerm = '';
  recordsFilterStatus = 'ALL';

  // Admin User Management state
  dbUsers: User[] = [];
  isUsersLoading = false;
  showUserModal = false;
  isEditingUser = false;
  editingUserId: string | null = null;
  userForm: FormGroup;

  // Asynchronous Latency Simulator State
  selectedDelayMs = 1200; // Default simulated delay to showcase async loading
  elapsedTimeMs = 0;
  lastResponseDurationMs: number | null = null;

  constructor() {
    this.userForm = this.fb.group({
      userId: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['welcome123', [Validators.required, Validators.minLength(4)]],
      role: ['General User', [Validators.required]],
      department: ['Candidate Screening', [Validators.required]],
      status: ['Active', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.isAdmin();

    // Initial data load showcasing async latency
    this.fetchRecords();

    if (this.isAdmin) {
      this.fetchDbUsers();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopLatencyTimer();
  }

  // ================= ASYNC TIMER HELPERS =================

  private startLatencyTimer(): void {
    this.elapsedTimeMs = 0;
    this.lastResponseDurationMs = null;
    const startTime = performance.now();

    this.timerSub = timer(0, 50).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.elapsedTimeMs = Math.round(performance.now() - startTime);
    });
  }

  private stopLatencyTimer(): void {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;
    }
    this.lastResponseDurationMs = this.elapsedTimeMs;
  }

  setDelayPreset(ms: number): void {
    this.selectedDelayMs = ms;
    this.notificationService.info(`API Latency set to ${ms}ms. Click Reload to observe async behavior.`);
  }

  // ================= RECORDS FETCHING =================

  fetchRecords(): void {
    if (!this.currentUser) return;

    this.isRecordsLoading = true;
    this.startLatencyTimer();

    this.recordService.getRecords(this.currentUser.userId, this.currentUser.role, this.selectedDelayMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isRecordsLoading = false;
          this.stopLatencyTimer();
          this.records = response.records || [];
          this.applyRecordFilters();
        },
        error: (err) => {
          this.isRecordsLoading = false;
          this.stopLatencyTimer();
          this.notificationService.error('Failed to load candidate verification records.');
        }
      });
  }

  applyRecordFilters(): void {
    this.filteredRecords = this.records.filter((rec) => {
      const matchesSearch =
        rec.candidateName.toLowerCase().includes(this.recordsSearchTerm.toLowerCase()) ||
        rec.candidateRole.toLowerCase().includes(this.recordsSearchTerm.toLowerCase()) ||
        rec.verificationType.toLowerCase().includes(this.recordsSearchTerm.toLowerCase()) ||
        rec.id.toLowerCase().includes(this.recordsSearchTerm.toLowerCase());

      const matchesStatus =
        this.recordsFilterStatus === 'ALL' || rec.status === this.recordsFilterStatus;

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyRecordFilters();
  }

  onFilterStatusChange(status: string): void {
    this.recordsFilterStatus = status;
    this.applyRecordFilters();
  }

  // ================= ADMIN USER MANAGEMENT =================

  fetchDbUsers(): void {
    if (!this.isAdmin) return;

    this.isUsersLoading = true;
    this.userService.getAllUsers(this.selectedDelayMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isUsersLoading = false;
          this.dbUsers = response.users || [];
        },
        error: (err) => {
          this.isUsersLoading = false;
          this.notificationService.error('Failed to load system users from XML database.');
        }
      });
  }

  openAddUserModal(): void {
    this.isEditingUser = false;
    this.editingUserId = null;
    this.userForm.reset({
      userId: '',
      name: '',
      email: '',
      password: 'password123',
      role: 'General User',
      department: 'Candidate Screening',
      status: 'Active'
    });
    this.showUserModal = true;
  }

  openEditUserModal(user: User): void {
    this.isEditingUser = true;
    this.editingUserId = user.id;
    this.userForm.patchValue({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status
    });
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.userForm.reset();
  }

  onSaveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValues = this.userForm.value;

    if (this.isEditingUser && this.editingUserId) {
      // Update existing user
      this.userService.updateUser(this.editingUserId, formValues).subscribe({
        next: (res) => {
          this.notificationService.success(`User updated successfully in XML database.`);
          this.closeUserModal();
          this.fetchDbUsers();
        },
        error: (err) => {
          this.notificationService.error(err.error?.message || 'Failed to update user.');
        }
      });
    } else {
      // Create new user
      const payload: CreateUserPayload = formValues;
      this.userService.createUser(payload).subscribe({
        next: (res) => {
          this.notificationService.success(`User ${res.user.userId} created and saved to XML DB.`);
          this.closeUserModal();
          this.fetchDbUsers();
        },
        error: (err) => {
          this.notificationService.error(err.error?.message || 'Failed to create user.');
        }
      });
    }
  }

  onDeleteUser(user: User): void {
    const confirmDelete = confirm(`Are you sure you want to delete user "${user.name}" (${user.userId}) from the database?`);
    if (!confirmDelete) return;

    this.userService.deleteUser(user.id).subscribe({
      next: (res) => {
        this.notificationService.success(`User ${user.userId} deleted successfully.`);
        this.fetchDbUsers();
      },
      error: (err) => {
        this.notificationService.error(err.error?.message || 'Failed to delete user.');
      }
    });
  }

  toggleUserStatus(user: User): void {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    this.userService.updateUser(user.id, { status: newStatus }).subscribe({
      next: () => {
        this.notificationService.success(`Status for ${user.userId} updated to ${newStatus}.`);
        this.fetchDbUsers();
      },
      error: () => {
        this.notificationService.error('Failed to update user status.');
      }
    });
  }
}
