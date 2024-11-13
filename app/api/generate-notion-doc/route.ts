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
      text: `Now create a detailed meeting prep document using this exact format and information. When information is not provided put "Not Applicable" and use Vercel and Next.js websites as context for the products and plans:

[Make the title look like this and substitute "Company Name" with the actual company name based on the website provided: Company Name - Prospect Analysis 📊]

## 1. Why'd They Take the Meeting 🤝

> Email Exchange Summary:
[Please provide a comprehensive analysis of the email screenshots above with these specific details:

1. Initial Email Analysis:
   - Full breakdown of the sender's first message
   - Key value propositions mentioned
   - Specific pain points or challenges highlighted
   - Any technical requirements or scale mentioned

2. Email Exchange Details:
   - Chronological summary of the back-and-forth
   - Notable quotes or specific language used
   - Response tone and level of interest
   - Any specific features or capabilities discussed

3. Meeting Motivation:
   - Primary drivers for accepting the meeting
   - Secondary factors influencing their decision
   - Timing considerations mentioned
   - Current tools or solutions they're using/replacing

${meetingReason ? `\nAdditional Context:\n${meetingReason}` : ''}]

## 2. Account Status 🔐

${accountType} account

## 3. Pro Team Usage 🛠️

[Please write a sentence that looks like this with the information provided, use proper grammar: This account is using the ${accountType} plan for ${proTeamUsage}. ]

## 4. Pro Bill Analysis 💰

[Please analyze the billing screenshots above and provide:
1. Current monthly spend breakdown by service
2. Spending trends over time
3. Key observations about usage patterns
4. Strategic recommendation for Enterprise upgrade based on:
   - If spend is near/above $2000/month
   - If they need more concurrent builds
   - If they need enhanced security features
   - If they need custom SLAs
   - If they need premium support

Make sure to include specific numbers and percentages when discussing spend and trends.]

## 5. Tech Stack 🔧

[Please analyze the CSV data provided above, and display the tech stack as bullet points. Provide suggestions as to why they might want to use Vercel or Next.js based on their tech stack] 

## 6. Company Overview 🏢

[Analyze and summarize with bullet points based on: ${companyWebsite}]

## 7. Company Funding 💵

Recent Funding Information:
${recentFunding} summarize with bullet points

## 8. Prospect Info 👤

[Please analyze the prospect screenshots provided above] give a detailed summary of the prospect and summarize with bullet points

Please provide detailed insights for each section based on all the information provided, including the images and CSV data shown above. Use markdown formatting and emojis as shown. Do not include any text underneath the final section`
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





