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
        fixture.detectChanges();
        await fixture.whenStable();

        const item = c.cartItems()[0];
        item.quantity = 2;
        fixture.detectChanges();
        await fixture.whenStable();

        expect(c.subtotal()).toBe(item.price * 2);
        expect(c.total()).toBe(item.price * 2);
    });
});
