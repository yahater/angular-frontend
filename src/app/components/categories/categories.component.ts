import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriesService } from '../../services/categories.service';
import { Category } from '../../models/expense.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  private categoriesService = inject(CategoriesService);
  categories: Category[] = [];

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoriesService.getCategories().subscribe({
      next: (categories) => this.categories = categories,
      error: (error) => console.error('Error loading categories:', error)
    });
  }

  getCategoryIcon(categoryName: string): string {
    const icons: { [key: string]: string } = {
      'grocery': '🛒',
      'bills': '📄',
      'restaurant': '🍽️',
      'hygiene': '🧴',
      'other': '📦'
    };
    return icons[categoryName.toLowerCase()] || '📦';
  }

  getCategoryColor(categoryName: string): string {
    const colors: { [key: string]: string } = {
      'grocery': '#27ae60',
      'bills': '#e74c3c',
      'restaurant': '#f39c12',
      'hygiene': '#3498db',
      'other': '#9b59b6'
    };
    return colors[categoryName.toLowerCase()] || '#9b59b6';
  }

  getCategoryDescription(categoryName: string): string {
    const descriptions: { [key: string]: string } = {
      'grocery': 'Food shopping, groceries, and household supplies',
      'bills': 'Utilities, rent, insurance, and recurring payments',
      'restaurant': 'Dining out, takeout, and food delivery',
      'hygiene': 'Personal care, toiletries, and health products',
      'other': 'Miscellaneous expenses that don\'t fit other categories'
    };
    return descriptions[categoryName.toLowerCase()] || 'General expense category';
  }
}