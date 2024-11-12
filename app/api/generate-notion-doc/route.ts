import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { cache } from 'react';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  maxRetries: 2,
});

const generateDoc = cache(async (content: any) => {
  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content
    }]
  });
  return response;
});

export async function POST(req: Request) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const formData = await req.formData();
    const meetingReason = formData.get('meetingReason') as string;
    const accountType = formData.get('accountType') as string || 'Not specified';
    const proTeamUsage = formData.get('proTeamUsage') as string;
    const companyWebsite = formData.get('companyWebsite') as string;
    const recentFunding = formData.get('recentFunding') as string;

    // Add debug logs
    console.log('Received account type:', accountType);
    console.log('All form data:', Object.fromEntries(formData.entries()));

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
          // Add image content block for email screenshots
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: value.type,
              data: buffer.toString('base64')
            }
          });
        } else if (value.type.includes('image')) {
          // Add image content block
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: value.type,
              data: buffer.toString('base64')
            }
          });
        } else if (value.name.endsWith('.csv')) {
          // Add CSV content as text block
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
[Please analyze the email screenshots above and provide a bullet-point summary of:
- A quick summary of the initial email sent
- The key points from the email exchange
- The main reason(s) they took the meeting
- Any specific pain points or needs mentioned
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

[Please analyze the prospect screenshots provided above] summarize with bullet points

Please provide detailed insights for each section based on all the information provided, including the images and CSV data shown above. Use markdown formatting and emojis as shown. Do not include any text underneath the final section`
    });

    console.log('Starting API call to Anthropic...'); // Debug log

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: messageContent
      }]
    });

    console.log('Received response from Anthropic'); // Debug log

    const textContent = response.content.find(c => c.type === 'text');
    const notionDoc = textContent?.text || 'No content generated';
    
    return NextResponse.json({ notionDoc });

  } catch (error) {
    console.error('Full error details:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' }, 
      { status: 500 }
    );
  }
}





