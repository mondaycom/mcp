export const GraphQLDescriptions = {
  commonArgs: {
    questionId: 'Question ID. Required for update/delete.',
  },
  form: {
    operations: {
      createForm: 'Create a new form with specified configuration. Returns the created form with its unique token.',
      updateForm: {
        action:
          'Action to execute on the form. Each action requires different fields — check field descriptions to know what to include.',
      },
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
      isAnonymous: 'Hides submitter identity.',
      type: 'The category or classification of the form for organizational purposes.',
      features: 'Object containing feature toggles and settings like password protection, response limits, etc.',
      appearance: 'Object containing visual styling settings including colors, fonts, layout, and branding.',
      accessibility: 'Object containing accessibility settings such as language, alt text, and reading direction.',
      tags: {
        description:
          'Array of tracking tags for categorization and analytics (e.g., UTM parameters for marketing tracking).',
        id: 'Required for update/delete. Auto-generated.',
        name: 'Required for create. Cannot be updated.',
        value: 'Required for create/update.',
        columnId: 'Auto-generated. Cannot be updated.',
      },
    },
    inputs: {
      title: 'Required for updateFormHeader.',
      description: 'Required for updateFormHeader.',
      input: 'Complete form configuration object containing properties to create or update.',
      questions: 'All question IDs in order. Must include every existing ID. Required for updateQuestionOrder.',
      questionId: 'Question ID. Required for update/delete.',
      tag: 'Tag to create/update/delete. Delete: id only. Create: name+value (id/columnId auto-generated). Update: id+new value.',
      form: {
        describe: 'Form data to update (patch semantics).',
        appearance: 'Patch. Required for updateAppearance.',
        accessibility: 'Patch. Required for updateAccessibility.',
        features: 'Patch. Required for updateFeatures.',
        questionOrder: 'Patch. Required for updateQuestionOrder.',
        formHeader: 'Patch. Required for updateFormHeader.',
      },
    },
    args: {
      destinationName: 'Board name (stores form responses).',
      boardSubscriberIds: 'User IDs to notify on board activity.',
      boardSubscriberTeamsIds: 'Team IDs to notify on board activity.',
    },
  },
  formSettings: {
    operations: {
      updateFormSettings: 'Update form configuration including features, appearance, and accessibility options.',
      setFormPassword: 'Required for setFormPassword action.',
      shortenUrl: 'Shorten a URL for a form and store it in the form settings. Returns the shortened link object.',
    },
    properties: {
      passwordEnabled: 'Can only be set to false. Use setFormPassword to enable.',
      closeDateValue: 'ISO timestamp.',
      includeNameQuestion: 'Adds name column as a form question.',
      includeUpdateQuestion: 'Adds updates/comments field linked to the board item.',
      syncQuestionAndColumnsTitles: 'Syncs question titles with board column names.',
      allowCreateItem: "Shows 'Create Item' button on the board to open this form.",
      backgroundValue: 'Hex color or image URL (depends on type).',
      logoSize: 'Logo size for the form header.',
      language: "Form locale, e.g. 'en', 'es', 'fr'.",
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
    actions: {
      type: 'Action to perform on the question of a form. create requires question. update requires questionId and question with type always included. delete requires questionId.',
      question:
        'The question to create or update. Always include type, then only the fields you want to set or change.',
    },
    properties: {
      title: 'Question text. Required when creating.',
      type: 'Question type. Always required. Cannot be changed after creation — always send the existing type when updating.',
      position: 'Integer specifying the display order of the question within the form (zero-based).',
      description: 'Help text shown under the question.',
      placeholder: 'Optional placeholder text shown in input fields to guide user input.',
      createdAt: 'ISO timestamp when the question was created.',
      updatedAt: 'ISO timestamp when the question was last modified.',
      selectOptions:
        'Options for select questions. Always include all options — omitting an existing option will delete it. To update safely, call get_form first to retrieve existing option values, then include all options you want to keep with their original value fields.',
      selectOptionsValue:
        'Unique identifier for the option. If this option was used in existing submissions, it must keep its original value to preserve data integrity.',
      blockType: 'The kind of block to create. Includes all question types and content block types.',
      insertAfterQuestionId: 'ID to insert after. Omit to append. Null for first position.',
      pageBlockId:
        'Page block ID to group this question within. Set to null to remove from page block. Omit to leave unchanged.',

    },
    showIfRules: 'Conditional visibility. All operators must be OR.',

    showIfConditionBuildingBlockId: 'Question ID to evaluate.',
    showIfConditionValues: 'Answer values that satisfy the condition.',
    inputs: {
      question: 'Complete question object containing all properties for creation or update.',
      questionData: 'Question configuration including type, title, and type-specific settings.',
      position: 'Integer position where the question should be placed in the form sequence.',
    },
  },
  questionSettings: {
    properties: {
      validation: 'Validation rules applied to the question response',
      prefill: 'Auto-populates from account data or URL query params.',

      prefillLookup: "Field name (e.g. 'email') or URL param name.",
      prefixAutofilled: 'Phone only. Auto-detects country prefix.',
      prefixPredefined: 'Phone only. Sets a default country prefix.',
      prefixPredefinedPrefix: "Country code, e.g. 'US', 'IL'.",
      checkedByDefault: 'Boolean question type only.',
      defaultCurrentDate: 'Date question type only.',
      includeTime: 'Date only. Adds time picker.',
      display: 'SingleSelect/MultiSelect only.',
      optionsOrder: 'SingleSelect/MultiSelect only.',
      locationAutofilled: 'Location only. Auto-fills current location.',
      limit: 'Rating questions only: Maximum rating value that users can select.',
      skipValidation: 'Link only. Skips URL format validation.',
      labelLimitCount: 'MultiSelect only. Max selections. Pair with labelLimitCountEnabled.',
      labelLimitCountEnabled: 'MultiSelect only. Enables selection limit.',
      defaultAnswer: 'ShortText/LongText/Name/Link only. Pre-filled default value.',
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
