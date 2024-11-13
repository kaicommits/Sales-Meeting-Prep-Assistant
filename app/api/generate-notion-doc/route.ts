import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { cache } from 'react';

// Initialize Anthropic client once at the top level
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 1,
});

export async function POST(request: Request) {
  try {
    console.log('API route started');
    
    // Log to verify API key
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);

    const formData = await request.formData();
    console.log('Form data received:', Object.fromEntries(formData.entries()));

    const meetingReason = formData.get('meetingReason') as string;
    const accountType = formData.get('accountType') as string || 'Not specified';
    const proTeamUsage = formData.get('proTeamUsage') as string;
    const companyWebsite = formData.get('companyWebsite') as string;
    const recentFunding = formData.get('recentFunding') as string;

    // Add debug logs
    console.log('Received account type:', accountType);

    // Create array to hold all content blocks
    let messageContent: any[] = [];

    // Add initial text block
    messageContent.push({
      type: "text",
      text: "Please analyze these files and create a meeting prep document:"
    });

    // Process files and add them as content blocks
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        
        if (key === 'meetingReason' && value.type.includes('image')) {
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: value.type,
              data: buffer.toString('base64')
            }
          });
        } else if (value.type.includes('image')) {
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: value.type,
              data: buffer.toString('base64')
            }
          });
        } else if (value.name.endsWith('.csv')) {
          messageContent.push({
            type: "text",
            text: `CSV Content for ${key}:\n${buffer.toString('utf-8')}`
          });
        }
      }
    }

    // Add final prompt text block
    messageContent.push({
      type: "text",
      text: `Create a clear, scannable meeting prep doc for a Vercel AE. Reference Vercel.com and Next.js.org for product context.

[Company Name from ${companyWebsite}] - Prospect Analysis 📊

## 1. Why'd They Take the Meeting 🤝

[Using the uploaded email/message screenshots, provide:]

• Initial Contact:
  - Who reached out first
  - What sparked their interest
  - Key features they mentioned
  - Their current scale

• Key Points:
  - Main discussion topics
  - Notable quotes
  - Technical needs
  - Timing/urgency

• Motivation:
  - Why Enterprise/Pro now
  - Current pain points
  - Growth plans
  - Tools they're using

${meetingReason ? `\nContext:\n${meetingReason}` : ''}

## 2. Account Status 🔐

${accountType ? `${accountType} account` : ''}

## 3. Pro Team Usage 🛠️

${(accountType && accountType !== 'New Customer' && proTeamUsage) ? 
  `This account is using the ${accountType} plan for ${proTeamUsage}.` 
  : ''}

## 4. Pro Bill Analysis 💰

[Based on the uploaded billing screenshots, provide:]

• Monthly spend and patterns
• Usage trends
• Growth indicators
• Enterprise fit based on:
  - $2000+ monthly spend
  - Build needs
  - Security needs
  - SLA requirements
  - Support requirements

Include key numbers and trends.

## 5. Tech Stack 🔧

[Using the uploaded Wappalyzer CSV file, provide:]

• Current stack overview
• Relevant Vercel/Next.js features
• Migration opportunities
• Enterprise features that fit their needs

## 6. Company Overview 🏢

${companyWebsite ? `• Core business
• Market focus
• Tech needs
• Vercel Enterprise fit` : ''}

## 7. Company Funding 💵

${recentFunding ? `• Latest rounds
• Growth path
• Scale needs
• Enterprise readiness` : ''}

## 8. Prospect Info 👤

[Based on the uploaded LinkedIn profile screenshots, provide:]

• Role/decision power
• Tech background
• Key experience
• Main responsibilities

Keep it focused on helping the AE position Vercel's value. Skip any sections where no files or information were provided. Use a friendly, professional tone.`
    });

    console.log('Starting API call to Anthropic...'); // Debug log

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{
        role: "user",
        content: messageContent
      }]
    });

    console.log('Received response from Anthropic'); // Debug log

    return NextResponse.json({
      success: true,
      content: response.content[0].text,
    });

  } catch (error: unknown) {
    console.error('Error details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
}





