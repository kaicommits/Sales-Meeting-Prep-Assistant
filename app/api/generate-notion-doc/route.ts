import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { vercelContext } from '../prompts/vercel-context';

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

    // Add Vercel context first
    messageContent.push({
      type: "text",
      text: `Here is important context about Vercel's Enterprise offering:\n\n${vercelContext}\n\n`
    });

    // Add initial instruction
    messageContent.push({
      type: "text",
      text: "Please analyze these files and create a meeting prep document:"
    });

    // Process files and add them as content blocks
    let techStackData = '';
    let hasProBill = false;
    let hasProspectInfo = false;
    let hasMeetingContext = false;

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        
        if (value.type.includes('image')) {
          // Track which types of screenshots we have
          if (key === 'proBill') {
            hasProBill = true;
          }
          if (key === 'prospectInfo') {
            hasProspectInfo = true;
          }
          if (key === 'meetingReason') {
            hasMeetingContext = true;
          }

          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: value.type,
              data: buffer.toString('base64')
            }
          });

          // Add context about what type of image this is
          messageContent.push({
            type: "text",
            text: `Above image is a screenshot of: ${key}`
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

    // Then add your regular prompt
    messageContent.push({
      type: "text",
      text: `You are a Business Development Representative at Vercel creating a meeting prep document.

IMPORTANT - REQUIRED FORMAT:
1. Use ONLY these sections in this order:
   - Company Background
   - Vercel Product Fit
   - Vercel Customer Story
   - Prospect Background
   - Meeting Background
2. DO NOT add any additional sections
3. DO NOT include a Key Takeaways section
4. DO NOT include a summary at the end
5. STOP after the Meeting Background section

The summary should be based on the following input variables:

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
   - Analyze the Screenshots of the company's LinkedIn page on Sales Navigator and look specifically for:
     * Company location
     * Employee count
     * Company revenue
     * Create bullet points for each of these points
   - Visit and analyze the company website URL provided above to understand:
     * Their product/service offerings
     * Target market and customer base
     * Create bullet points for each of these points
   - Research the company and find:
     * Funding information (REQUIRED):
       - If found: Include the exact amount, date, and stage and cite source
       - If not found: Explicitly state "No funding information found"
     * Create bullet points for each of these points

Vercel Product Fit:
   - Technology Stack Analysis:
     * Review the Wappalyzer CSV data provided above
     * Based on their current technology choices, identify which Vercel Enterprise features would benefit them most
     * Highlight any competing or complementary technologies in their stack
     * Summarize why their tech stack makes them a good fit for Vercel Enterprise

   ${hasProBill ? `- Pro Plan Usage Analysis:
     * REQUIRED - Extract and list these exact numbers from the Pro Bill screenshots:
       - Total bill amount for last month (exact number required, e.g., "$1,234.56")
       - List the top 3 cost items with exact amounts and percentages (all three required):
         > [Item 1 name]: $XXX.XX (XX% of total)
         > [Item 2 name]: $XXX.XX (XX% of total)
         > [Item 3 name]: $XXX.XX (XX% of total)
       - Show month-over-month spending trend with specific numbers
       DO NOT skip showing these exact numbers` 
   : '- Note: No Pro Bill information provided'}

   Use Vercel's product documentation as context for:
   - Enterprise plan features and benefits
   - Usage limits and pricing thresholds
   - Enterprise-specific capabilities

Vercel Customer Story:
   - Review the company's website and the provided Vercel customer stories
   - Select the most relevant customer story based on:
     * Similar industry or business model
     * Similar technical challenges
     * Similar scale or growth trajectory
   - Summarize why this customer story would resonate with the prospect
   - Highlight specific metrics or improvements that would be relevant to them
   - Give multiple bullet points that the Account Executive can use to sell Vercel Enterprise to the prospect

Prospect Background:
   - IMPORTANT: This section is about the CUSTOMER/PROSPECT only
   ${hasProspectInfo ? 
     `- Use ONLY the prospect's LinkedIn profile screenshots to list:
       * Their current role (as shown on LinkedIn)
       * Their tenure (as shown on LinkedIn)
       * Their location (as shown on LinkedIn)
       * Their education (as shown on LinkedIn)
       * Their previous experience (as shown on LinkedIn)` 
     : '- Note: No prospect LinkedIn profile screenshot provided'}
   - DO NOT use information from meeting/email screenshots in this section
   - DO NOT confuse this with the SDR's information

Meeting Background:
   - IMPORTANT: This section is about the CONVERSATION between SDR and prospect
   ${hasMeetingContext ? 
     `- Use ONLY the meeting context screenshots (email/LinkedIn/call notes) to show:
       * What the SDR said to secure the meeting
       * How the prospect responded
       * Any specific interests/concerns mentioned by the prospect` 
     : '- Note: No meeting context screenshots provided'}
   - DO NOT use information from the prospect's LinkedIn profile here
   - DO NOT confuse the prospect's LinkedIn profile with meeting context

Format your summary as a list of bullet points, with no more than 15 points in total. Use clear and concise language, and ensure that each point provides valuable information for the Account Executive.

Begin your summary with the heading "Meeting Preparation Summary" and use subheadings for each section.`
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





