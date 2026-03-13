import { beforeEach, describe, expect, it } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminNavbarComponent } from './admin-navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';

describe('AdminNavbarComponent', () => {
  let component: AdminNavbarComponent;
  let fixture: ComponentFixture<AdminNavbarComponent>;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      currentUser: signal({ email: 'admin@example.com' }),
      logout: () => {}
    };

    await TestBed.configureTestingModule({
      imports: [AdminNavbarComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set user name from email', () => {
    expect(component.userName()).toBe('Admin');
  });

  it('should toggle menu', () => {
    expect(component.isMenuOpen()).toBeFalsy();
    component.toggleMenu();
    expect(component.isMenuOpen()).toBeTruthy();
    component.toggleMenu();
    expect(component.isMenuOpen()).toBeFalsy();
  });

  it('should close menu on link click', () => {
    component.isMenuOpen.set(true);
    component.onNavLinkClick();
    expect(component.isMenuOpen()).toBeFalsy();
  });
});
