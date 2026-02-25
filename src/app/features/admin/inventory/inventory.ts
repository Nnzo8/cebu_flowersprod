import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminNavbarComponent } from '../../../shared/components/admin-navbar.component/admin-navbar.component';
import { ProductService, Product } from '../../../core/services/product.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminNavbarComponent],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inventory {
  private formBuilder = inject(FormBuilder);
  private productService = inject(ProductService);

  // State: Products list
  readonly products = signal<Product[]>([]);

  // State: Form visibility
  readonly isFormOpen = signal(false);

  // State: Currently selected product (null = create mode)
  readonly selectedProduct = signal<Product | null>(null);

  // State: Loading state
  readonly isLoading = signal(false);

  // State: Drag-and-drop active state
  readonly isDragActive = signal(false);

  // State: Image preview URL (for both URL and file uploads)
  readonly imagePreviewUrl = signal<string | null>(null);

  // Form
  productForm: FormGroup;

  // Computed: Is form in edit mode?
  readonly isEditMode = computed(() => this.selectedProduct() !== null);

  // Computed: Form title
  readonly formTitle = computed(() =>
    this.isEditMode() ? 'Edit Product' : 'Add New Product'
  );

  constructor() {
    this.productForm = this.initializeForm();
    this.loadProducts();
  }

  /**
   * Initialize reactive form
   */
  private initializeForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      imageUrl: ['', Validators.required],
    });
  }

  /**
   * Load products from API
   */
  private loadProducts(): void {
    this.isLoading.set(true);
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load products:', error);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Open form for creating new product
   */
  openCreateForm(): void {
    this.selectedProduct.set(null);
    this.productForm.reset();
    this.imagePreviewUrl.set(null);
    this.isFormOpen.set(true);
  }

  /**
   * Open form for editing existing product
   */
  editProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.productForm.patchValue({
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      imageUrl: product.imageUrl,
    });
    this.imagePreviewUrl.set(product.imageUrl);
    this.isFormOpen.set(true);
  }

  /**
   * Close form and reset
   */
  closeForm(): void {
    this.isFormOpen.set(false);
    this.selectedProduct.set(null);
    this.productForm.reset();
    this.imagePreviewUrl.set(null);
    this.isDragActive.set(false);
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive.set(true);
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive.set(false);
  }

  /**
   * Handle dropped files
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  /**
   * Handle file input change
   */
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  /**
   * Process image file and convert to data URL or handle file path
   */
  private processImageFile(file: File): void {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Convert file to data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.imagePreviewUrl.set(dataUrl);
      // Update form with the data URL
      this.productForm.patchValue({
        imageUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  }

  /**
   * Handle image URL input change
   */
  onImageUrlChange(url: string): void {
    if (url) {
      this.imagePreviewUrl.set(url);
    }
  }

  /**
   * Save product (create or update)
   */
  saveProduct(): void {
    if (this.productForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    const formValue = this.productForm.value;
    const selected = this.selectedProduct();

    if (selected) {
      // Update existing product
      this.productService.updateProduct(selected.id, {
        name: formValue.name,
        price: formValue.price,
        category: formValue.category,
        description: formValue.description,
        imageUrl: formValue.imageUrl,
      }).subscribe({
        next: (updatedProduct) => {
          console.log('Product updated:', updatedProduct);
          this.products.update(products =>
            products.map(p => (p.id === updatedProduct.id ? updatedProduct : p))
          );
          this.isLoading.set(false);
          this.closeForm();
        },
        error: (error) => {
          console.error('Failed to update product:', error);
          this.isLoading.set(false);
        },
      });
    } else {
      // Create new product
      this.productService.createProduct({
        name: formValue.name,
        price: formValue.price,
        category: formValue.category,
        description: formValue.description,
        imageUrl: formValue.imageUrl,
      }).subscribe({
        next: (newProduct) => {
          console.log('Product created:', newProduct);
          this.products.update(products => [newProduct, ...products]);
          this.isLoading.set(false);
          this.closeForm();
        },
        error: (error) => {
          console.error('Failed to create product:', error);
          this.isLoading.set(false);
        },
      });
    }
  }

  /**
   * Delete product with confirmation
   */
  deleteProduct(product: Product): void {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.productService.deleteProduct(product.id).subscribe({
        next: () => {
          console.log('Product deleted:', product.id);
          this.products.update(products => products.filter(p => p.id !== product.id));
        },
        error: (error) => {
          console.error('Failed to delete product:', error);
        },
      });
    }
  }
}
