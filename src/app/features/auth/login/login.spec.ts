import { beforeEach, describe, expect, it } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';

describe('Login', () => {
    let component: Login;
    let fixture: ComponentFixture<Login>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Login]
        })
            .compileComponents();

        fixture = TestBed.createComponent(Login);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should login', async () => {
        const fixture = TestBed.createComponent(Login);
        const c = fixture.componentInstance;
        await fixture.whenStable();
        expect(c).toBeTruthy();
    });
});
