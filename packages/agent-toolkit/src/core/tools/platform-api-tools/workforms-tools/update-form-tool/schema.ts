import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { Alignment, BackgroundType, Direction, FontSize, Format, LogoPosition, LogoSize } from '../workforms.types';

export enum FormActions {
  activate = 'activate',
  deactivate = 'deactivate',
  shortenFormUrl = 'shortenFormUrl',
  setFormPassword = 'setFormPassword',
  createTag = 'createTag',
  deleteTag = 'deleteTag',
  updateTag = 'updateTag',
  updateAppearance = 'updateAppearance',
  updateAccessibility = 'updateAccessibility',
  updateFeatures = 'updateFeatures',
  updateQuestionOrder = 'updateQuestionOrder',
  updateFormHeader = 'updateFormHeader',
}

const tagSchema = z.object({
  id: z.string().describe(GraphQLDescriptions.form.properties.tags.id).optional(),
  name: z.string().describe(GraphQLDescriptions.form.properties.tags.name).optional(),
  value: z.string().describe(GraphQLDescriptions.form.properties.tags.value).optional(),
  columnId: z.string().describe(GraphQLDescriptions.form.properties.tags.columnId).optional(),
});

const backgroundSchema = z.object({
  type: z.nativeEnum(BackgroundType).optional(),
  value: z.string().describe(GraphQLDescriptions.formSettings.properties.backgroundValue).optional(),
});

const layoutSchema = z.object({
  format: z.nativeEnum(Format).optional(),
  alignment: z.nativeEnum(Alignment).optional(),
  direction: z.nativeEnum(Direction).optional(),
});

const logoSchema = z.object({
  position: z.nativeEnum(LogoPosition).optional(),
  size: z.nativeEnum(LogoSize).describe(GraphQLDescriptions.formSettings.properties.logoSize).optional(),
});

const submitButtonSchema = z.object({
  text: z.string().optional(),
});

const textSchema = z.object({
  font: z.string().optional(),
  color: z.string().optional(),
  size: z.nativeEnum(FontSize).optional(),
});

const redirectAfterSubmissionSchema = z.object({
  enabled: z.boolean().optional(),
  redirectUrl: z.string().optional(),
});

const afterSubmissionViewSchema = z.object({
  allowEditSubmission: z.boolean().optional(),
  allowResubmit: z.boolean().optional(),
  allowViewSubmission: z.boolean().optional(),
  description: z.string().optional(),
  redirectAfterSubmission: redirectAfterSubmissionSchema.optional(),
  showSuccessImage: z.boolean().optional(),
  title: z.string().optional(),
});

const closeDateSchema = z.object({
  enabled: z.boolean().optional(),
  date: z.string().describe(GraphQLDescriptions.formSettings.properties.closeDateValue).optional(),
});

const draftSubmissionSchema = z.object({
  enabled: z.boolean().optional(),
});

const mondaySchema = z.object({
  itemGroupId: z.string().optional(),
  includeNameQuestion: z.boolean().describe(GraphQLDescriptions.formSettings.properties.includeNameQuestion).optional(),
  includeUpdateQuestion: z
    .boolean()
    .describe(GraphQLDescriptions.formSettings.properties.includeUpdateQuestion)
    .optional(),
  syncQuestionAndColumnsTitles: z
    .boolean()
    .describe(GraphQLDescriptions.formSettings.properties.syncQuestionAndColumnsTitles)
    .optional(),
  allow_create_item: z.boolean().describe(GraphQLDescriptions.formSettings.properties.allowCreateItem).optional(),
});

const passwordSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.passwordEnabled).optional(),
});

const startButtonSchema = z.object({
  text: z.string().optional(),
});

const preSubmissionViewSchema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  startButton: startButtonSchema.optional(),
});

const requireLoginSchema = z.object({
  enabled: z.boolean().optional(),
  redirectToLogin: z.boolean().optional(),
});

const responseLimitSchema = z.object({
  enabled: z.boolean().optional(),
  limit: z.number().optional(),
});

const appearanceSchema = z.object({
  background: backgroundSchema.optional(),
  hideBranding: z.boolean().optional(),
  layout: layoutSchema.optional(),
  logo: logoSchema.optional(),
  primaryColor: z.string().optional(),
  showProgressBar: z.boolean().optional(),
  submitButton: submitButtonSchema.optional(),
  text: textSchema.optional(),
});

const accessibilitySchema = z.object({
  language: z.string().describe(GraphQLDescriptions.formSettings.properties.language).optional(),
  logoAltText: z.string().optional(),
});

const aiTranslateSchema = z.object({
  enabled: z.boolean().optional(),
});

const featuresSchema = z.object({
  afterSubmissionView: afterSubmissionViewSchema.optional(),
  ai_translate: aiTranslateSchema.optional(),
  closeDate: closeDateSchema.optional(),
  draftSubmission: draftSubmissionSchema.optional(),
  monday: mondaySchema.optional(),
  password: passwordSchema.optional(),
  preSubmissionView: preSubmissionViewSchema.optional(),
  reCaptchaChallenge: z.boolean().optional(),
  requireLogin: requireLoginSchema.optional(),
  responseLimit: responseLimitSchema.optional(),
  is_anonymous: z.boolean().describe(GraphQLDescriptions.form.properties.isAnonymous).optional(),
});

const dehydratedQuestionSchema = z.object({
  id: z.string().describe(GraphQLDescriptions.form.inputs.questionId),
  page_block_id: z.string().describe(GraphQLDescriptions.question.properties.pageBlockId).optional(),
});

const formSchema = z.object({
  appearance: appearanceSchema.describe(GraphQLDescriptions.form.inputs.form.appearance).optional(),
  accessibility: accessibilitySchema.describe(GraphQLDescriptions.form.inputs.form.accessibility).optional(),
  features: featuresSchema.describe(GraphQLDescriptions.form.inputs.form.features).optional(),
  title: z.string().describe(GraphQLDescriptions.form.inputs.title).optional(),
  description: z.string().describe(GraphQLDescriptions.form.inputs.description).optional(),
  questions: z.array(dehydratedQuestionSchema).describe(GraphQLDescriptions.form.inputs.questions).optional(),
});

export const updateFormToolSchema = {
  formToken: z.string(),
  action: z.nativeEnum(FormActions).describe(GraphQLDescriptions.form.operations.updateForm.action),
  formPassword: z.string().describe(GraphQLDescriptions.formSettings.operations.setFormPassword).optional(),
  tag: tagSchema.describe(GraphQLDescriptions.form.inputs.tag).optional(),
  form: formSchema.describe(GraphQLDescriptions.form.inputs.form.describe).optional(),
};
