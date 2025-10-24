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
  type: z.nativeEnum(BackgroundType).describe(GraphQLDescriptions.formSettings.properties.backgroundType).optional(),
  value: z.string().describe(GraphQLDescriptions.formSettings.properties.backgroundValue).optional(),
});

const layoutSchema = z.object({
  format: z.nativeEnum(Format).describe(GraphQLDescriptions.formSettings.properties.format).optional(),
  alignment: z.nativeEnum(Alignment).describe(GraphQLDescriptions.formSettings.properties.alignment).optional(),
  direction: z.nativeEnum(Direction).describe(GraphQLDescriptions.formSettings.properties.direction).optional(),
});

const logoSchema = z.object({
  position: z.nativeEnum(LogoPosition).describe(GraphQLDescriptions.formSettings.properties.logoPosition).optional(),
  size: z.nativeEnum(LogoSize).describe(GraphQLDescriptions.formSettings.properties.logoSize).optional(),
});

const submitButtonSchema = z.object({
  text: z.string().describe(GraphQLDescriptions.formSettings.properties.submitButtonText).optional(),
});

const textSchema = z.object({
  font: z.string().describe(GraphQLDescriptions.formSettings.properties.font).optional(),
  color: z.string().describe(GraphQLDescriptions.formSettings.properties.textColor).optional(),
  size: z.nativeEnum(FontSize).describe(GraphQLDescriptions.formSettings.properties.fontSize).optional(),
});

const redirectAfterSubmissionSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.redirectAfterSubmissionEnabled).optional(),
  redirectUrl: z.string().describe(GraphQLDescriptions.formSettings.properties.redirectUrl).optional(),
});

const afterSubmissionViewSchema = z.object({
  allowEditSubmission: z.boolean().describe(GraphQLDescriptions.formSettings.properties.allowEditSubmission).optional(),
  allowResubmit: z.boolean().describe(GraphQLDescriptions.formSettings.properties.allowResubmit).optional(),
  allowViewSubmission: z.boolean().describe(GraphQLDescriptions.formSettings.properties.allowViewSubmission).optional(),
  description: z.string().describe(GraphQLDescriptions.formSettings.properties.postSubmissionDescription).optional(),
  redirectAfterSubmission: redirectAfterSubmissionSchema
    .describe(GraphQLDescriptions.formSettings.properties.redirectAfterSubmission)
    .optional(),
  showSuccessImage: z.boolean().describe(GraphQLDescriptions.formSettings.properties.showSuccessImage).optional(),
  title: z.string().describe(GraphQLDescriptions.formSettings.properties.postSubmissionTitle).optional(),
});

const closeDateSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.closeDateEnabled).optional(),
  date: z.string().describe(GraphQLDescriptions.formSettings.properties.closeDateValue).optional(),
});

const draftSubmissionSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.draftSubmissionEnabled).optional(),
});

const mondaySchema = z.object({
  itemGroupId: z.string().describe(GraphQLDescriptions.formSettings.properties.itemGroupId).optional(),
  includeNameQuestion: z.boolean().describe(GraphQLDescriptions.formSettings.properties.includeNameQuestion).optional(),
  includeUpdateQuestion: z
    .boolean()
    .describe(GraphQLDescriptions.formSettings.properties.includeUpdateQuestion)
    .optional(),
  syncQuestionAndColumnsTitles: z
    .boolean()
    .describe(GraphQLDescriptions.formSettings.properties.syncQuestionAndColumnsTitles)
    .optional(),
});

const passwordSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.passwordEnabled).optional(),
});

const startButtonSchema = z.object({
  text: z.string().describe(GraphQLDescriptions.formSettings.properties.startButtonText).optional(),
});

const preSubmissionViewSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.preSubmissionEnabled).optional(),
  title: z.string().describe(GraphQLDescriptions.formSettings.properties.preSubmissionTitle).optional(),
  description: z.string().describe(GraphQLDescriptions.formSettings.properties.preSubmissionDescription).optional(),
  startButton: startButtonSchema.describe(GraphQLDescriptions.formSettings.properties.startButton).optional(),
});

const requireLoginSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.requireLoginEnabled).optional(),
  redirectToLogin: z.boolean().describe(GraphQLDescriptions.formSettings.properties.redirectToLogin).optional(),
});

const responseLimitSchema = z.object({
  enabled: z.boolean().describe(GraphQLDescriptions.formSettings.properties.responseLimitEnabled).optional(),
  limit: z.number().describe(GraphQLDescriptions.formSettings.properties.responseLimitValue).optional(),
});

const appearanceSchema = z.object({
  background: backgroundSchema.describe(GraphQLDescriptions.formSettings.properties.background).optional(),
  hideBranding: z.boolean().describe(GraphQLDescriptions.formSettings.properties.hideBranding).optional(),
  layout: layoutSchema.describe(GraphQLDescriptions.formSettings.properties.layout).optional(),
  logo: logoSchema.describe(GraphQLDescriptions.formSettings.properties.logo).optional(),
  primaryColor: z.string().describe(GraphQLDescriptions.formSettings.properties.primaryColor).optional(),
  showProgressBar: z.boolean().describe(GraphQLDescriptions.formSettings.properties.showProgressBar).optional(),
  submitButton: submitButtonSchema.describe(GraphQLDescriptions.formSettings.properties.submitButton).optional(),
  text: textSchema.describe(GraphQLDescriptions.formSettings.properties.text).optional(),
});

const accessibilitySchema = z.object({
  language: z.string().describe(GraphQLDescriptions.formSettings.properties.language).optional(),
  logoAltText: z.string().describe(GraphQLDescriptions.formSettings.properties.logoAltText).optional(),
});

const featuresSchema = z.object({
  afterSubmissionView: afterSubmissionViewSchema
    .describe(GraphQLDescriptions.formSettings.properties.afterSubmissionView)
    .optional(),
  closeDate: closeDateSchema.describe(GraphQLDescriptions.formSettings.properties.closeDate).optional(),
  draftSubmission: draftSubmissionSchema
    .describe(GraphQLDescriptions.formSettings.properties.draftSubmission)
    .optional(),
  monday: mondaySchema.describe(GraphQLDescriptions.formSettings.properties.monday).optional(),
  password: passwordSchema.describe(GraphQLDescriptions.formSettings.properties.password).optional(),
  preSubmissionView: preSubmissionViewSchema
    .describe(GraphQLDescriptions.formSettings.properties.preSubmissionView)
    .optional(),
  reCaptchaChallenge: z.boolean().describe(GraphQLDescriptions.formSettings.properties.reCaptchaChallenge).optional(),
  requireLogin: requireLoginSchema.describe(GraphQLDescriptions.formSettings.properties.requireLogin).optional(),
  responseLimit: responseLimitSchema.describe(GraphQLDescriptions.formSettings.properties.responseLimit).optional(),
});

const dehydratedQuestionSchema = z.object({
  id: z.string().describe(GraphQLDescriptions.form.inputs.questionId),
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
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  action: z.nativeEnum(FormActions).describe(GraphQLDescriptions.form.operations.updateForm.action),
  formPassword: z.string().describe(GraphQLDescriptions.formSettings.operations.setFormPassword).optional(),
  tag: tagSchema.describe(GraphQLDescriptions.form.inputs.tag).optional(),
  tagStringified: z.string().optional().describe('**ONLY FOR MICROSOFT COPILOT**: The tag data. Send this as a stringified JSON of "tag" field. Read "tag" field description for details how to use it.'),
  form: formSchema.describe(GraphQLDescriptions.form.inputs.form.describe).optional(),
  formStringified: z.string().optional().describe('**ONLY FOR MICROSOFT COPILOT**: The form data. Send this as a stringified JSON of "form" field. Read "form" field description for details how to use it.'),
};
