import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavbarComponent } from '../../../shared/components/navbar.component/navbar.component';

interface SocialLink {
  icon: string;
  label: string;
  url: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private sanitizer = inject(DomSanitizer);

  ownerName = 'Cebu Flowers';
  ownerLocation = 'Cebu City, Philippines';

  socialLinks: SocialLink[] = [
    {
      icon: 'email',
      label: 'Email',
      url: 'ninorollaneocliasa684@gmail.com',
      ariaLabel: 'Send an email',
    },
    {
      icon: 'facebook',
      label: 'Facebook',
      url: 'https://www.facebook.com/share/1C36wmjsrH/',
      ariaLabel: 'Visit Facebook profile',
    },
    {
      icon: 'twitter',
      label: 'Twitter',
      url: 'https://twitter.com',
      ariaLabel: 'Visit Twitter profile',
    },
    {
      icon: 'instagram',
      label: 'Instagram',
      url: 'https://www.instagram.com/cebuunigueflowers?igsh=dTVjeDVtNG02bGlu',
      ariaLabel: 'Visit Instagram profile',
    },
  ];

  /**
   * Get SVG icon based on icon name and sanitize it for HTML rendering
   */
  getSvgIcon(iconName: string): SafeHtml {
    const icons: { [key: string]: string } = {
      email: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
      facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a6 6 0 0 0-6 6v4a6 6 0 0 0 6 6h3v4a2 2 0 0 0 2 2h3v-4h-3v-4h3a2 2 0 0 0 2-2v-4a6 6 0 0 0-6-6z"/></svg>`,
      twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2s9 5 20 5a9.5 9.5 0 0 0-9-5.5c4.75 2.25 7-7 7-7"/></svg>`,
      instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>`,
    };
    
    // Bypass Angular's built-in SVG stripping
    return this.sanitizer.bypassSecurityTrustHtml(icons[iconName] || '');
  }
}