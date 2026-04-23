import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

declare global { interface Window { Plaid?: any; } }

@Injectable({ providedIn: 'root' })
export class PlaidLinkService {
  private api = inject(ApiService);

  /**
   * Launches Plaid Link and resolves once account(s) have been exchanged + saved.
   * Relies on the Plaid Link script loaded from CDN in index.html.
   */
  async link(entityId: string): Promise<{ item: any; accounts: any[] }> {
    const { link_token } = await this.api.createLinkToken().toPromise() as any;

    return new Promise((resolve, reject) => {
      if (!window.Plaid) { reject(new Error('Plaid Link script not loaded')); return; }
      const handler = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token: string, metadata: any) => {
          try {
            const result = await this.api.exchangePublicToken(public_token, entityId, metadata).toPromise();
            resolve(result);
          } catch (e) { reject(e); }
        },
        onExit: (err: any) => { if (err) reject(err); },
      });
      handler.open();
    });
  }
}
