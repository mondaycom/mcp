import { z } from 'zod';

const phoneAnswerSchema = z.object({
  phone: z.string().describe('The phone number.'),
  country_short_name: z.string().describe('The ISO 3166-1 alpha-2 country code (e.g. "US").'),
});

const countryAnswerSchema = z.object({
  country_name: z.string().describe('The full country name (e.g. "United States").'),
  country_code: z.string().describe('The ISO 3166-1 alpha-2 country code (e.g. "US").'),
});

const dateAnswerSchema = z.object({
  date: z.string().describe('The date in YYYY-MM-DD format.'),
  zone_diff: z.number().int().optional().describe('UTC offset in minutes.'),
});

const dateRangeAnswerSchema = z.object({
  from: z.string().describe('Start date in YYYY-MM-DD format.'),
  to: z.string().describe('End date in YYYY-MM-DD format.'),
});

const locationAnswerSchema = z.object({
  lat: z.number().describe('Latitude.'),
  lng: z.number().describe('Longitude.'),
  place_id: z.string().describe('Google Maps place ID.'),
  address: z.string().describe('Full formatted address.'),
  country: z.object({
    long_name: z.string().describe('Full country name.'),
    short_name: z.string().describe('ISO 3166-1 alpha-2 country code.'),
  }),
  city: z.object({
    long_name: z.string().describe('Full city name.'),
    short_name: z.string().describe('Abbreviated city name.'),
  }),
  street: z.object({
    long_name: z.string().describe('Full street name.'),
    short_name: z.string().describe('Abbreviated street name.'),
  }),
  street_number: z.object({
    long_name: z.string().describe('Full street number.'),
    short_name: z.string().describe('Abbreviated street number.'),
  }),
});

const fileAnswerSchema = z.object({
  id: z.string().describe('The file ID returned by the workforms upload endpoint.'),
  name: z.string().describe('Original file name (e.g. "image.png").'),
  extension: z.string().optional().describe('File extension (e.g. "pdf", "png").'),
  is_image: z.boolean().optional().describe('Whether the file is an image.'),
});

const formAnswerInputSchema = z
  .object({
    question_id: z.string().describe('The ID of the question being answered.'),
    name: z.string().optional().describe('Answer for name questions.'),
    email: z.string().optional().describe('Answer for email questions.'),
    short_text: z.string().optional().describe('Answer for short text questions.'),
    long_text: z.string().optional().describe('Answer for long text questions.'),
    link: z.string().optional().describe('Answer for link questions.'),
    updates: z.string().optional().describe('Answer for updates questions.'),
    boolean: z.boolean().optional().describe('Answer for boolean questions.'),
    number: z.number().optional().describe('Answer for number questions.'),
    rating: z
      .number()
      .positive()
      .optional()
      .describe("Answer for rating questions. Must be a positive number within the question's configured limit."),
    single_select: z.string().optional().describe('Answer for single-select questions — the selected option ID.'),
    multi_select: z
      .array(z.number())
      .optional()
      .describe('Answer for multi-select questions — list of selected option IDs.'),
    people: z
      .array(z.string())
      .optional()
      .describe('Answer for people questions — list of user IDs. Obtain user IDs via the list_users_and_teams tool.'),
    connected_boards: z
      .array(z.string())
      .optional()
      .describe('Answer for connected boards questions — list of connected item IDs.'),
    phone: phoneAnswerSchema.optional().describe('Answer for phone questions.'),
    country: countryAnswerSchema.optional().describe('Answer for country questions.'),
    date: dateAnswerSchema.optional().describe('Answer for date questions.'),
    date_range: dateRangeAnswerSchema.optional().describe('Answer for date range questions.'),
    location: locationAnswerSchema
      .optional()
      .describe('Answer for location questions. Requires a Google Maps place ID and structured address components.'),
    file: z
      .array(fileAnswerSchema)
      .optional()
      .describe(
        "Answer for file questions. Each file must be uploaded first to obtain a file ID. Up to the question's configured limit.",
      ),
    signature: fileAnswerSchema
      .optional()
      .describe('Answer for signature questions. The file must be uploaded first to obtain a file ID.'),
  })
  .describe(
    'An answer for a single form question. Set question_id and exactly one answer field matching the question type. Subitems questions are not supported.',
  );

export const createSubmissionToolSchema = {
  form_token: z
    .string()
    .describe(
      'The unique token identifying the WorkForm. Can be a bare token, a full WorkForm URL (e.g. https://forms.monday.com/forms/abc123?r=use1), or a shortened wkf.ms URL (e.g. https://wkf.ms/4tqP28t). Shortened URLs are automatically resolved by following the redirect.',
    ),
  answers: z
    .array(formAnswerInputSchema)
    .describe('Array of answers to submit. Each answer specifies a question_id and the value for that question type.'),
  form_timezone_offset: z
    .number()
    .int()
    .min(-840)
    .max(840)
    .describe('The timezone offset of the submitter in minutes (e.g. -120 for UTC-2, 0 for UTC).'),
  password: z
    .string()
    .optional()
    .describe(
      'The password for the WorkForm. Only required if the WorkForm has password protection enabled (check features.password.enabled from get_form). If required, ask the user for the password before submitting.',
    ),
  tags: z
    .array(
      z.object({
        column_id: z.string().describe('The column ID this tag maps to.'),
        value: z.string().describe('The tag value to submit.'),
      }),
    )
    .optional()
    .describe('Tags to attach to the submission — each tag maps a value to a specific board column.'),
};
