export const GraphQLDescriptions = {
  commonArgs: {
    formToken: 'The unique identifier token for the form. Required for all form-specific operations.',
    questionId: 'The unique identifier for the question. Used to target specific questions within a form.',
  },
  form: {
    operations: {
      createForm: 'Create a new form with specified configuration. Returns the created form with its unique token.',
      updateForm: 'Update form properties including title, description, or question order.',
      activateForm: 'Activate a form to make it visible to users and accept new submissions.',
      deactivateForm: 'Deactivate a form to hide it from users and stop accepting submissions. Form data is preserved.',
    },
    properties: {
      id: 'The unique identifier for the form. Auto-generated upon creation.',
      token: 'The unique token used to access and identify the form. Used in public URLs and API calls.',
      boardId: 'The board ID connected to the form. Used to store form responses as items.',
      title: 'The display title shown to users at the top of the form.',
      description: 'Optional detailed description explaining the form purpose, displayed below the title.',
      active: 'Boolean indicating if the form is currently accepting responses and visible to users.',
      ownerId: 'The ID of the user who created and owns this form. Determines permissions.',
      createWithAI: 'Boolean indicating if this form was initially created using AI assistance.',
      builtWithAI: 'Boolean indicating if this form was built or modified using AI functionality.',
      questions: 'Array of question objects that make up the form content, in display order.',
      isSuspicious:
        'Boolean flag indicating if the form has been flagged for review due to suspicious content or activity.',
      isAnonymous: 'Boolean indicating if responses are collected without identifying the submitter.',
      type: 'The category or classification of the form for organizational purposes.',
      features: 'Object containing feature toggles and settings like password protection, response limits, etc.',
      appearance: 'Object containing visual styling settings including colors, fonts, layout, and branding.',
      accessibility: 'Object containing accessibility settings such as language, alt text, and reading direction.',
      tags: 'Array of tracking tags for categorization and analytics (e.g., UTM parameters for marketing tracking).',
    },
    inputs: {
      title: 'The title text for the form. Must be at least 1 character long.',
      description: 'Optional description text providing context about the form purpose.',
      input: 'Complete form configuration object containing properties to create or update.',
      questions: 'Ordered array of question IDs for reordering. Must include all existing question IDs.',
    },
    args: {
      formToken: 'The unique form token identifying which form to operate on.',
      includeFullFormDetails:
        'Boolean indicating if the full form details should be included in the response. Default will be to only return the core properties of the form and its questions',
      destinationWorkspaceId: 'The workspace in which the form will be created in.',
      destinationFolderId: 'The folder in which the form will be created under.',
      destinationFolderName: 'The name of the folder in which the form will be created in.',
      boardKind: 'The board kind to create for the board in which the form will create items in.',
      destinationName: 'The name of the board that will be created to store the form responses in.',
      boardOwnerIds:
        'Array of user IDs who will have owner permissions on the board in which the form will create items in.',
      boardOwnerTeamIds:
        'Array of team IDs whose members will have owner permissions on the board in which the form will create items in.',
      boardSubscriberIds:
        'Array of user IDs who will receive notifications about board activity for the board in which the form will create items in.',
      boardSubscriberTeamsIds:
        'Array of team IDs whose members will receive notifications about board activity for the board in which the form will create items in.',
    },
  },
  formSettings: {
    operations: {
      updateFormSettings: 'Update form configuration including features, appearance, and accessibility options.',
      setFormPassword:
        'Set a password on a form to restrict access. This will enable password protection for the form.',
      shortenUrl: 'Shorten a URL for a form and store it in the form settings. Returns the shortened link object.',
    },
    properties: {
      features:
        'Object containing form features including but not limited to password protection, response limits, login requirements, etc.',
      appearance: 'Object containing visual styling including colors, layout, fonts, and branding elements.',
      accessibility: 'Object containing accessibility options such as language, alt text, etc.',
      isInternal: 'Boolean indicating if the form is restricted to internal users only.',
      reCaptchaChallenge: 'Boolean enabling reCAPTCHA verification to prevent spam submissions.',
      password: 'Object containing password protection configuration for the form.',
      passwordEnabled:
        'Boolean enabling password protection. When true, users must enter a password to access the form.',
      requireLogin: 'Object containing login requirement settings for form access.',
      requireLoginEnabled: 'Boolean requiring users to be logged in before submitting responses.',
      redirectToLogin: 'Boolean automatically redirecting unauthenticated users to the login page.',
      shortenedLink: 'Object containing shortened URL configuration for easy form sharing.',
      shortenedLinkEnabled: 'Boolean enabling generation of shortened URLs for the form.',
      shortenedLinkUrl: 'The generated shortened URL for form access. Only available when shortened links are enabled.',
      draftSubmission: 'Object containing draft saving configuration allowing users to save progress.',
      draftSubmissionEnabled: 'Boolean allowing users to save incomplete responses as drafts.',
      aiTranslate: 'Object containing AI translation configuration for the form.',
      aiTranslateEnabled: 'Boolean enabling AI translation for the form.',
      responseLimit: 'Object containing response limitation settings to control submission volume.',
      responseLimitEnabled: 'Boolean enabling response count limits for the form.',
      responseLimitValue: 'Integer specifying the maximum number of responses allowed.',
      closeDate: 'Object containing automatic form closure configuration.',
      closeDateEnabled: 'Boolean enabling automatic form closure at a specified date and time.',
      closeDateValue: 'ISO timestamp when the form will automatically stop accepting responses.',
      allowResubmit: 'Boolean allowing users to submit multiple responses to the same form.',
      allowEditSubmission: 'Boolean allowing users to modify their submitted responses after submission.',
      allowViewSubmission: 'Boolean allowing users to view their submitted responses.',
      preSubmissionView: 'Object containing welcome screen configuration displayed before the form.',
      preSubmissionEnabled: 'Boolean showing a welcome/introduction screen before the form begins.',
      preSubmissionTitle: 'Text displayed as the title on the welcome screen.',
      preSubmissionDescription: 'Text providing context or instructions on the welcome screen.',
      startButton: 'Object containing start button configuration for the welcome screen.',
      startButtonText: 'Custom text for the button that begins the form experience.',
      afterSubmissionView: 'Object containing settings for the post-submission user experience.',
      postSubmissionTitle: 'Text displayed as the title after successful form submission.',
      postSubmissionDescription: 'Text shown to users after they complete the form.',
      showSuccessImage: 'Boolean displaying a success image after form completion.',
      redirectAfterSubmission: 'Object containing redirect configuration after form submission.',
      redirectAfterSubmissionEnabled: 'Boolean enabling automatic redirect after form completion to a specified URL.',
      redirectUrl: 'The URL where users will be redirected after successfully submitting the form.',
      monday: 'Object containing board settings for response handling.',
      itemGroupId: 'The board group ID where new items from form responses will be created.',
      includeNameQuestion:
        'Boolean adding a name question to the form. This is a special question type that represents the name column from the associated monday board',
      includeUpdateQuestion:
        'Boolean adding an update/comment field to the form. This is a special question type that represents the updates from the associated item of the submission on the monday board. ',
      syncQuestionAndColumnsTitles:
        'Boolean synchronizing form question titles with board column names. When true, the form question titles will be synchronized with the board column names.',
      hideBranding: 'Boolean hiding monday branding from the form display.',
      showProgressBar: 'Boolean displaying a progress indicator showing form completion progress bar.',
      primaryColor: 'Hex color code for the primary theme color used throughout the form.',
      layout: 'Object containing form structure and presentation settings.',
      format: 'String specifying the form display format. Can be a step by step form or a classic one page form.',
      alignment: 'String controlling text and content alignment.',
      direction: 'String setting reading direction.',
      background: 'Object containing background appearance configuration for the form.',
      backgroundType: 'String specifying background style.',
      backgroundValue:
        'String containing the background value. The value will depend on the background type. If the background type is color, the value will be a hex color code. If the background type is image, the value will be an image URL.',
      text: 'Object containing typography and text styling configuration.',
      font: 'String specifying the font family used throughout the form.',
      textColor: 'Hex color code for the text color in the form.',
      fontSize: 'String or number specifying the base font size for form text.',
      logo: 'Object containing logo display configuration for form branding.',
      logoPosition: 'String specifying logo placement ("top", "bottom", "header").',
      logoUrl: 'URL pointing to the logo image file for display on the form.',
      logoSize:
        'String specifying logo size ("small", "medium", "large") for the logo that appears on the header of the form.',
      logoAltText: 'Alternative text description for the logo image for accessibility.',
      submitButton: 'Object containing submit button styling and text configuration.',
      submitButtonText: 'Custom text displayed on the form submission button.',
      language: 'Language code for form localization and interface text (e.g., "en", "es", "fr").',
    },
    inputs: {
      settings: 'Complete form settings object containing all configuration options.',
      features: 'Form features configuration including security, limits, and access controls.',
      appearance: 'Visual styling configuration including colors, layout, and branding.',
      accessibility: 'Accessibility configuration including language and reading direction.',
      password:
        'Password configuration for the form. Only setting enabled to false is supported. To enable a form to be password protected, please use the set_form_password mutation instead.',
      passwordValue: 'The password to set for the form. Must be at least 1 character long.',
    },
  },
  question: {
    operations: {
      createQuestion: 'Create a new question within a form. Returns the created question with auto-generated ID.',
      updateQuestion:
        'Update an existing question properties including title, type, or settings. Requires question ID.',
      deleteQuestion: 'Permanently remove a question from a form. This action cannot be undone.',
    },
    properties: {
      title:
        'The question text displayed to respondents. Must be at least 1 character long and clearly indicate the expected response.',
      type: 'The question type determining input behavior and validation (e.g., "text", "email", "single_select", "multi_select").',
      visible:
        'Boolean controlling question visibility to respondents. Hidden questions remain in form structure but are not displayed.',
      required: 'Boolean indicating if the question must be answered before form submission.',
      position: 'Integer specifying the display order of the question within the form (zero-based).',
      description:
        'Optional explanatory text providing additional context, instructions, or examples for the question.',
      placeholder: 'Optional placeholder text shown in input fields to guide user input.',
      createdAt: 'ISO timestamp when the question was created.',
      updatedAt: 'ISO timestamp when the question was last modified.',
      selectOptions:
        'Array of option objects for choice-based questions (single_select, multi_select). Required for select types.',
      selectLabel: 'The display text for individual option choices in select-type questions.',
    },
    inputs: {
      question: 'Complete question object containing all properties for creation or update.',
      questionData: 'Question configuration including type, title, and type-specific settings.',
      position: 'Integer position where the question should be placed in the form sequence.',
    },
  },
  questionSettings: {
    properties: {
      validation: 'Validation rules applied to the question response',
      prefill:
        'Configuration for automatically populating question values from various data sources such as user account information or URL query parameters.',
      prefillEnabled:
        'Whether prefill functionality is enabled for this question. When true, the question will attempt to auto-populate values from the specified source.',
      prefillSource:
        'The data source to use for prefilling the question value. Check the PrefillSources for available options.',
      prefillLookup:
        'The specific field or parameter name to lookup from the prefill source. For account sources, this would be a user property like "name" or "email". For query parameters, this would be the parameter name that would be set in the URL.',
      prefixAutofilled:
        "Phone questions only: Automatically detect and fill the phone country prefix based on the user's geographic location or browser settings.",
      prefixPredefined:
        'Phone questions only: Configuration for setting a specific predefined phone country prefix that will be pre-selected for users.',
      prefixPredefinedEnabled:
        'Whether a predefined phone prefix is enabled for phone number questions. When true, the specified prefix will be pre-selected.',
      prefixPredefinedPrefix:
        'The predefined phone country prefix to use as country code in capital letters (e.g., "US", "UK", "IL"). Only used when enabled is true.',
      checkedByDefault:
        'Boolean/checkbox questions only: Whether the checkbox should be checked by default when the form loads.',
      defaultCurrentDate:
        'Date based questions only: Automatically set the current date as the default value when the form loads.',
      includeTime:
        'Date questions only: Whether to include time selection (hours and minutes) in addition to the date picker. When false, only date selection is available.',
      display:
        'Single/Multi Select questions only: Controls how the selection options are visually presented to users.',
      optionsOrder: 'Single/Multi Select questions only: Determines the ordering of selection options.',
      labelLimitCount: 'Multi Select questions only: Limits the number of options a user can select.',
      locationAutofilled:
        "Location questions only: Automatically detect and fill the user's current location using browser geolocation services, requiring user permission.",
      limit: 'Rating questions only: Maximum rating value that users can select.',
      skipValidation: 'Link/URL questions only: Whether to skip URL format validation, allowing any text input.',
    },
    inputs: {
      settings: 'Question-specific configuration object that varies by question type.',
      validationRules: 'Validation constraints and rules',
      choiceOptions: 'List of available choices for selection questions',
      fileSettings: 'File upload constraints and settings',
    },
  },
  tag: {
    operations: {
      createTag: 'Create a new tag for a form. Tags are used to categorize and track responses. (e.g. UTM tags)',
      deleteTag: 'Delete a tag from a form',
      updateTag: 'Update an existing tag in a form',
    },
    properties: {
      id: 'The unique identifier for the tag',
      name: 'The name of the tag',
      value: 'The value of the tag',
      columnId: 'The ID of the column this tag is associated with',
    },
    inputs: {
      tagInput: 'The tag data to create',
      name: 'The name of the tag. Must be unique within the form and not reserved.',
      value: 'The value of the tag',
      deleteTagInput: 'Options for deleting the tag',
    },
  },
};
