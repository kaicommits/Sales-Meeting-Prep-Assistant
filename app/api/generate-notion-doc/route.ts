import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client once at the top level
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 1,
});

type MessageContent = {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

export async function POST(request: Request) {
  try {
    console.log('API route started');
    
    // Log to verify API key
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);

    const formData = await request.formData();
    console.log('Form data received:', Object.fromEntries(formData.entries()));

    const meetingReason = formData.get('meetingReason') as string;
    const companyWebsite = formData.get('companyWebsite') as string;

    // Create array to hold all content blocks
    let messageContent: MessageContent[] = [];

    // Add initial text block
    messageContent.push({
      type: "text",
      text: "Please analyze these files and create a meeting prep document:"
    });

    // Process files and add them as content blocks
    let techStackData = '';
    let hasProBill = false;

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        
        if (value.type.includes('image')) {
          if (key === 'proBill') {
            hasProBill = true;
          }
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: value.type,
              data: buffer.toString('base64')
            }
          });
        } else if (value.name.endsWith('.csv')) {
          techStackData = buffer.toString('utf-8');
          messageContent.push({
            type: "text",
            text: `Current Technology Stack (from Wappalyzer CSV):\n${techStackData}`
          });
        }
      } else if (key === 'companyWebsite') {
        messageContent.push({
          type: "text",
          text: `Company Website URL: ${value}`
        });
      }
    }

    // Add final prompt text block
    messageContent.push({
      type: "text",
      text: `You are a Business Development Representative at Vercel tasked with creating a concise summary to help a Vercel Account Executive prepare for a meeting with a prospective or current customer. The summary should be based on the following input variables:

-Screenshots of the company's LinkedIn page on Sales Navigator (provided as companySalesNav screenshots)
-The company's website URL (provided as companyWebsite)
-A CSV file containing the company's technology stack (provided as techStack files)
-Screenshots of the company's current spending on the Vercel Pro plan (provided as proBill screenshots)
-Screenshots of the prospect's LinkedIn profile (provided as prospectInfo screenshots)
-Screenshots of email/LinkedIn conversation or notes from the phone call that set the meeting (provided as meetingReason screenshots)

Using these inputs, create a summary with the following sections:

1. Company Background
2. Vercel Product Fit
3. Vercel Customer Story
4. Prospect Background
5. Meeting Background

Guidelines for each section:

Company Background:
   - Analyze the Screenshots of the company's LinkedIn page on Sales Navigator
   - Visit and analyze the company website URL provided above
   - Summarize the company's business, market position, funding (if applicable), employee count, and revenue

Vercel Product Fit:
   - Review the technology stack data provided above from the Wappalyzer CSV file
   - Based on their current tech stack, identify specific Vercel product offerings that could benefit the company
   ${hasProBill ? '- Analyze the Pro Bill screenshots provided above to assess if the prospect is a good fit for Vercel\'s Enterprise plan based on their current usage and spending and details about their current spending and why or why not this means they would be a good fit for Vercel\'s Enterprise plan' : '- Note: No Pro Bill information provided'}
   - Use Vercel's web pages as additional context for product recommendations
   - Use Vercel's web pages as additional context for analyzing the Pro Bill to see if the prospect is a good fit for Vercel's Enterprise plan based on their current usage and spending

Vercel Customer Story:
   - Based on the company's website URL, find a relevant customer story from Vercel's website

Prospect Background:
   - Analyze the Screenshots of the prospect's LinkedIn profile
   - Summarize the prospect's current role, tenure, location, education, and previous experience

Meeting Background:
   - Review the screenshots of email/LinkedIn conversation or notes from the phone call that set the meeting
   - Summarize the SDR's pitch that secured the meeting
   - Include any additional information provided by the prospect about their interest

Format your summary as a list of bullet points, with no more than 15 points in total. Use clear and concise language, and ensure that each point provides valuable information for the Account Executive.

Begin your summary with the heading "Meeting Preparation Summary" and use subheadings for each section.

Context provided:
- Company Website: ${companyWebsite}
${meetingReason ? `- Additional Context: ${meetingReason}` : ''}

Please analyze all provided screenshots and files to create this summary.`
    });

    console.log('Starting API call to Anthropic...'); // Debug log

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{
        role: "user",
        content: messageContent as any[] // temporary type assertion until Anthropic fixes their types
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





