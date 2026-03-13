import { beforeEach, describe, expect, it } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cart } from './cart';
import { provideRouter } from "@angular/router";

describe('Cart', () => {
    let component: Cart;
    let fixture: ComponentFixture<Cart>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Cart],
            providers: [provideRouter([])]
        })
            .compileComponents();

        fixture = TestBed.createComponent(Cart);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should ensure subtotals and totals update when quantity changes', async () => {
        const fixture = TestBed.createComponent(Cart);
        const c = fixture.componentInstance as any;
        
        // Mock some initial items in the service
        const mockItem = { 
            id: '1', 
            productId: 'p1', 
            name: 'Rose', 
            price: 100, 
            quantity: 1, 
            imageUrl: '' 
        };
        c.cartService.cartItems.set([mockItem]);
        
        fixture.detectChanges();
        await fixture.whenStable();

        // Use the component's method which triggers the signal update
        c.updateQuantity('1', 2);
        
        fixture.detectChanges();
        await fixture.whenStable();

        expect(c.subtotal()).toBe(200);
        expect(c.total()).toBe(200);
    });
});
