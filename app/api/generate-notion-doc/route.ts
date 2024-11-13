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
      text: `You are creating a Notion document for a Vercel Account Executive preparing for a sales meeting. Use Vercel.com and Next.js.org as your knowledge base for product offerings and features. Create a concise, human-written style document using this exact format:

[Extract the company name from ${companyWebsite} and format the title as: Company Name - Prospect Analysis 📊]

## 1. Why'd They Take the Meeting 🤝

> Meeting Context Analysis:
[Analyze the provided email/LinkedIn screenshots and structure your response as follows:

1. Meeting Origin:
   - Who initiated the conversation and their role
   - Initial pain points or requirements mentioned
   - Specific Vercel/Next.js features they're interested in
   - Scale of their current or planned deployment

2. Conversation Highlights:
   - Key discussion points from the exchange
   - Direct quotes showing interest or concerns
   - Technical requirements discussed
   - Timeline or urgency indicators

3. Decision Drivers:
   - Main reason for pursuing Enterprise/Pro
   - Current development challenges
   - Growth or scaling concerns
   - Existing tools or workflows they're using

${meetingReason ? `\nAdditional Context:\n${meetingReason}` : ''}]

## 2. Account Status 🔐

${accountType} account

## 3. Pro Team Usage 🛠️

${(accountType && accountType !== 'New Customer' && proTeamUsage) ? 
  `This account is using the ${accountType} plan for ${proTeamUsage}.` 
  : ''}

## 4. Pro Bill Analysis 💰

[Review the billing screenshots and highlight:
1. Monthly spend patterns and total
2. Usage trends across services
3. Notable spikes or consistent growth
4. Enterprise upgrade potential based on:
   - Monthly spend approaching/exceeding $2000
   - Build concurrency needs
   - Security requirements
   - SLA requirements
   - Support needs

Include specific numbers and growth percentages where available.]

## 5. Tech Stack 🔧

[From the CSV data:
- List their current technology stack
- Identify specific Vercel/Next.js features that complement their stack
- Note any potential migration or integration opportunities
- Suggest Enterprise features that align with their technical needs]

## 6. Company Overview 🏢

[Based on ${companyWebsite}, provide:
- Company's core business and market
- Scale and target audience
- Technical infrastructure needs
- Potential use cases for Vercel Enterprise]

## 7. Company Funding 💵

[Analyze ${recentFunding} and highlight:
- Recent funding rounds
- Growth trajectory
- Infrastructure scaling needs
- Enterprise readiness indicators]

## 8. Prospect Info 👤

[From the LinkedIn screenshots, summarize:
- Role and decision-making authority
- Technical background
- Relevant experience
- Key areas of focus/responsibility]

Focus on actionable insights that help the AE position Vercel's Enterprise value. If any section lacks input data, leave the section blank rather than speculating. Maintain a professional yet conversational tone throughout.`
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





