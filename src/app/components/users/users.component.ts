import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private usersService = inject(UsersService);
  
  users: any[] = [];
  primaryUserId: number | null = null;

  ngOnInit() {
    this.loadUsers();
    this.loadPrimaryUser();
  }

  loadUsers() {
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        
        // Set first user as default primary user if none is set and users exist
        if (users.length > 0 && this.primaryUserId === null) {
          this.setPrimaryUser(users[0].id);
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  loadPrimaryUser() {
    this.primaryUserId = this.usersService.getPrimaryUserId();
  }

  setPrimaryUser(userId: number) {
    this.primaryUserId = userId;
    this.usersService.setPrimaryUserId(userId);
    console.log(`Set user ${userId} as primary user`);
  }
}