import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonthSummary } from '@repo/shared-types';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  dryRun?: boolean;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
  ) {}

  /**
   * Format integer paisa to readable PKR string.
   */
  private formatPaisa(paisa: number): string {
    const rupees = Math.floor(Math.abs(paisa) / 100);
    const formatted = rupees.toLocaleString('en-PK');
    return paisa < 0 ? `-Rs ${formatted}` : `Rs ${formatted}`;
  }

  /**
   * Load and render a version-controlled HTML template with parameter map.
   */
  private loadTemplate(templateName: string, vars: Record<string, string>): string {
    const candidates = [
      path.join(__dirname, 'templates', templateName),
      path.join(process.cwd(), 'apps', 'api', 'src', 'email', 'templates', templateName),
      path.join(process.cwd(), 'src', 'email', 'templates', templateName),
    ];

    let content = '';
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        content = fs.readFileSync(candidate, 'utf-8');
        break;
      }
    }

    if (!content) {
      this.logger.warn(`Template ${templateName} not found on disk, using basic fallback wrapper`);
      content = `<html><body><h2>Ledger Notification</h2><p>${JSON.stringify(vars)}</p></body></html>`;
    }

    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }

    return content;
  }

  /**
   * Core dispatcher using Brevo SMTP API (POST https://api.brevo.com/v3/smtp/email).
   */
  async sendBrevoEmail(params: {
    to: string;
    subject: string;
    htmlContent: string;
  }): Promise<EmailSendResult> {
    const apiKey =
      this.configService?.get<string>('BREVO_API_KEY') || process.env.BREVO_API_KEY;
    const senderEmail =
      this.configService?.get<string>('BREVO_SENDER_EMAIL') ||
      process.env.BREVO_SENDER_EMAIL ||
      'notifications@ledger.app';

    if (!apiKey) {
      this.logger.log(
        `[DRY RUN - No BREVO_API_KEY] Email to: ${params.to} | Subject: "${params.subject}"`,
      );
      return { success: true, dryRun: true };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Ledger Finance',
            email: senderEmail,
          },
          to: [{ email: params.to }],
          subject: params.subject,
          htmlContent: params.htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Brevo API Error (${response.status}): ${errorData}`);
        return { success: false };
      }

      const resJson = (await response.json()) as { messageId?: string };
      this.logger.log(`Email successfully dispatched via Brevo: messageId=${resJson.messageId}`);
      return { success: true, messageId: resJson.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send email via Brevo: ${err.message}`, err.stack);
      return { success: false };
    }
  }

  /**
   * Trigger 1: Budget threshold alert (80% or 100%).
   */
  async sendBudgetThresholdAlert(data: {
    toEmail: string;
    monthLabel: string;
    budget: number;
    used: number;
    threshold: 80 | 100;
  }): Promise<EmailSendResult> {
    const remaining = data.budget - data.used;
    const isOver = data.threshold === 100;

    const alertTitle = isOver
      ? `Budget Limit Exceeded: ${data.monthLabel}`
      : `Approaching Budget Limit: ${data.monthLabel}`;

    const badgeBg = isOver ? '#FEE2E2' : '#FEF3C7';
    const badgeText = isOver ? '#991B1B' : '#92400E';
    const remainingColor = remaining < 0 ? '#C1543C' : '#0B4F4A';

    const webUrl =
      this.configService?.get<string>('CORS_ORIGIN_WEB') ||
      process.env.CORS_ORIGIN_WEB ||
      'https://ledger.app';

    const htmlContent = this.loadTemplate('budget-threshold.html', {
      alertTitle,
      monthLabel: data.monthLabel,
      thresholdPercent: String(data.threshold),
      budgetFormatted: this.formatPaisa(data.budget),
      usedFormatted: this.formatPaisa(data.used),
      remainingFormatted: this.formatPaisa(remaining),
      badgeBg,
      badgeText,
      remainingColor,
      dashboardUrl: webUrl,
    });

    return this.sendBrevoEmail({
      to: data.toEmail,
      subject: `[Ledger] ${alertTitle}`,
      htmlContent,
    });
  }

  /**
   * Trigger 2: Month-end summary report.
   */
  async sendMonthEndSummary(
    toEmail: string,
    summary: MonthSummary,
  ): Promise<EmailSendResult> {
    const webUrl =
      this.configService?.get<string>('CORS_ORIGIN_WEB') ||
      process.env.CORS_ORIGIN_WEB ||
      'https://ledger.app';

    const categoryRowsHtml = summary.categoryBreakdown.length
      ? summary.categoryBreakdown
          .map(
            (c) => `
            <tr style="border-bottom: 1px solid #F5F5F4;">
              <td style="padding: 10px 0; font-size: 14px; color: #1C1917;">${c.categoryName}</td>
              <td align="right" style="padding: 10px 0; font-size: 14px; font-weight: 600; color: #1C1917;">${this.formatPaisa(c.total)}</td>
              <td align="right" style="padding: 10px 0; font-size: 14px; color: #78716C;">${c.percentage}%</td>
            </tr>
          `,
          )
          .join('')
      : `<tr><td colspan="3" style="padding: 12px 0; color: #78716C; text-align: center;">No categorized expenses for this cycle.</td></tr>`;

    const remainingColor = summary.remaining < 0 ? '#C1543C' : '#0B4F4A';

    const htmlContent = this.loadTemplate('month-end-summary.html', {
      monthLabel: summary.label,
      budgetFormatted: this.formatPaisa(summary.budget),
      totalSpentFormatted: this.formatPaisa(summary.totalSpent),
      remainingFormatted: this.formatPaisa(summary.remaining),
      remainingColor,
      categoryRowsHtml,
      dashboardUrl: webUrl,
    });

    return this.sendBrevoEmail({
      to: toEmail,
      subject: `[Ledger] Summary Report for ${summary.label}`,
      htmlContent,
    });
  }

  /**
   * Trigger 3: Guest to account conversion confirmation.
   */
  async sendAccountUpgradeConfirmation(toEmail: string): Promise<EmailSendResult> {
    const webUrl =
      this.configService?.get<string>('CORS_ORIGIN_WEB') ||
      process.env.CORS_ORIGIN_WEB ||
      'https://ledger.app';

    const htmlContent = this.loadTemplate('account-upgrade.html', {
      email: toEmail,
      dashboardUrl: webUrl,
    });

    return this.sendBrevoEmail({
      to: toEmail,
      subject: '[Ledger] Your account has been confirmed',
      htmlContent,
    });
  }
}
