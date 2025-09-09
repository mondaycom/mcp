import { gql } from 'graphql-request';

// ============================================================================
// FRAGMENTS - Reusable field selections to reduce duplication
// ============================================================================

// Basic question fields
const QuestionBasicFragment = gql`
  fragment QuestionBasic on FormQuestion {
    id
    type
    title
    description
    visible
    required
  }
`;

// Question options
const QuestionOptionsFragment = gql`
  fragment QuestionOptions on FormQuestion {
    options {
      label
    }
  }
`;

// Question settings with all nested fields
const QuestionSettingsFragment = gql`
  fragment QuestionSettings on FormQuestion {
    settings {
      prefill {
        enabled
        source
        lookup
      }
      prefixAutofilled
      prefixPredefined {
        enabled
        prefix
      }
      checkedByDefault
      defaultCurrentDate
      includeTime
      display
      optionsOrder
      locationAutofilled
      limit
      skipValidation
    }
  }
`;

// Complete question with all fields
const QuestionCompleteFragment = gql`
  fragment QuestionComplete on FormQuestion {
    ...QuestionBasic
    ...QuestionOptions
    ...QuestionSettings
    showIfRules
  }
  ${QuestionBasicFragment}
  ${QuestionOptionsFragment}
  ${QuestionSettingsFragment}
`;

// Form features with all nested objects
const FormFeaturesFragment = gql`
  fragment FormFeatures on FormFeatures {
    isInternal
    reCaptchaChallenge
    shortenedLink {
      enabled
      url
    }
    password {
      enabled
    }
    draftSubmission {
      enabled
    }
    requireLogin {
      enabled
      redirectToLogin
    }
    responseLimit {
      enabled
      limit
    }
    closeDate {
      enabled
      date
    }
    preSubmissionView {
      enabled
      title
      description
      startButton {
        text
      }
    }
    afterSubmissionView {
      title
      description
      redirectAfterSubmission {
        enabled
        redirectUrl
      }
      allowResubmit
      showSuccessImage
      allowEditSubmission
      allowViewSubmission
    }
    monday {
      itemGroupId
      includeNameQuestion
      includeUpdateQuestion
      syncQuestionAndColumnsTitles
    }
  }
`;

// Form appearance with all styling options
const FormAppearanceFragment = gql`
  fragment FormAppearance on FormAppearance {
    hideBranding
    showProgressBar
    primaryColor
    layout {
      format
      alignment
      direction
    }
    background {
      type
      value
    }
    text {
      font
      color
      size
    }
    logo {
      position
      url
      size
    }
    submitButton {
      text
    }
  }
`;

// Form accessibility settings
const FormAccessibilityFragment = gql`
  fragment FormAccessibility on FormAccessibility {
    language
    logoAltText
  }
`;

// Form tag fields
const FormTagFragment = gql`
  fragment FormTag on FormTag {
    id
    name
    value
    columnId
  }
`;

// ============================================================================
// QUERIES AND MUTATIONS
// ============================================================================

// Create a new monday form (API version 2025-10)
export const createForm = gql`
  mutation createForm(
    $destination_workspace_id: ID!
    $destination_folder_id: ID
    $destination_folder_name: String
    $board_kind: BoardKind
    $destination_name: String
    $board_owner_ids: [ID!]
    $board_owner_team_ids: [ID!]
    $board_subscriber_ids: [ID!]
    $board_subscriber_teams_ids: [ID!]
  ) {
    create_form(
      destination_workspace_id: $destination_workspace_id
      destination_folder_id: $destination_folder_id
      destination_folder_name: $destination_folder_name
      board_kind: $board_kind
      destination_name: $destination_name
      board_owner_ids: $board_owner_ids
      board_owner_team_ids: $board_owner_team_ids
      board_subscriber_ids: $board_subscriber_ids
      board_subscriber_teams_ids: $board_subscriber_teams_ids
    ) {
      boardId
      token
    }
  }
`;

// Fetch a full form with all its details by its token
export const getForm = gql`
  query getForm($formToken: String!) {
    form(formToken: $formToken) {
      id
      token
      title
      description
      active
      ownerId
      type
      builtWithAI
      isAnonymous
      questions {
        ...QuestionComplete
      }
      features {
        ...FormFeatures
      }
      appearance {
        ...FormAppearance
      }
      accessibility {
        ...FormAccessibility
      }
      tags {
        ...FormTag
      }
    }
  }
  ${QuestionCompleteFragment}
  ${FormFeaturesFragment}
  ${FormAppearanceFragment}
  ${FormAccessibilityFragment}
  ${FormTagFragment}
`;

export const deleteFormQuestion = gql`
  mutation deleteFormQuestion($formToken: String!, $questionId: String!) {
    delete_question(formToken: $formToken, questionId: $questionId)
  }
`;

export const createFormQuestion = gql`
  mutation createFormQuestion($formToken: String!, $question: CreateQuestionInput!) {
    create_form_question(formToken: $formToken, question: $question) {
      ...QuestionBasic
      ...QuestionOptions
      ...QuestionSettings
    }
  }
  ${QuestionBasicFragment}
  ${QuestionOptionsFragment}
  ${QuestionSettingsFragment}
`;

export const updateFormQuestion = gql`
  mutation updateFormQuestion($formToken: String!, $questionId: String!, $question: UpdateQuestionInput!) {
    update_form_question(formToken: $formToken, questionId: $questionId, question: $question) {
      ...QuestionBasic
      ...QuestionOptions
      ...QuestionSettings
    }
  }
  ${QuestionBasicFragment}
  ${QuestionOptionsFragment}
  ${QuestionSettingsFragment}
`;

export const updateForm = gql`
  mutation updateForm($formToken: String!, $input: UpdateFormInput!) {
    update_form(formToken: $formToken, input: $input) {
      title
      description
      questions {
        id
      }
    }
  }
`;

export const updateFormSettings = gql`
  mutation updateFormSettings($formToken: String!, $settings: UpdateFormSettingsInput!) {
    update_form_settings(formToken: $formToken, settings: $settings) {
      features {
        ...FormFeatures
      }
      appearance {
        ...FormAppearance
      }
      accessibility {
        ...FormAccessibility
      }
    }
  }
  ${FormFeaturesFragment}
  ${FormAppearanceFragment}
  ${FormAccessibilityFragment}
`;

export const setFormPassword = gql`
  mutation setFormPassword($formToken: String!, $input: SetFormPasswordInput!) {
    set_form_password(formToken: $formToken, input: $input) {
      id
    }
  }
`;

export const shortenFormUrl = gql`
  mutation shortenFormUrl($formToken: String!) {
    shorten_form_url(formToken: $formToken) {
      enabled
      url
    }
  }
`;

export const deactivateForm = gql`
  mutation deactivateForm($formToken: String!) {
    deactivate_form(formToken: $formToken)
  }
`;

export const activateForm = gql`
  mutation activateForm($formToken: String!) {
    activate_form(formToken: $formToken)
  }
`;

export const deleteFormTag = gql`
  mutation deleteFormTag($formToken: String!, $tagId: String!) {
    delete_form_tag(formToken: $formToken, tagId: $tagId)
  }
`;

export const createFormTag = gql`
  mutation createFormTag($formToken: String!, $tag: CreateFormTagInput!) {
    create_form_tag(formToken: $formToken, tag: $tag) {
      ...FormTag
    }
  }
  ${FormTagFragment}
`;

export const updateFormTag = gql`
  mutation updateFormTag($formToken: String!, $tagId: String!, $tag: UpdateFormTagInput!) {
    update_form_tag(formToken: $formToken, tagId: $tagId, tag: $tag)
  }
`;

export const updateFormAppearance = gql`
  mutation updateFormAppearance($formToken: String!, $appearance: FormAppearanceInput!) {
    update_form_settings(formToken: $formToken, settings: { appearance: $appearance }) {
      appearance {
        ...FormAppearance
      }
    }
  }
  ${FormAppearanceFragment}
`;

export const updateFormAccessibility = gql`
  mutation updateFormAccessibility($formToken: String!, $accessibility: FormAccessibilityInput!) {
    update_form_settings(formToken: $formToken, settings: { accessibility: $accessibility }) {
      accessibility {
        ...FormAccessibility
      }
    }
  }
  ${FormAccessibilityFragment}
`;

export const updateFormFeatures = gql`
  mutation updateFormFeatures($formToken: String!, $features: FormFeaturesInput!) {
    update_form_settings(formToken: $formToken, settings: { features: $features }) {
      features {
        ...FormFeatures
      }
    }
  }
  ${FormFeaturesFragment}
`;

export const updateFormQuestionOrder = gql`
  mutation updateFormQuestionOrder($formToken: String!, $questions: [QuestionOrderInput!]!) {
    update_form(formToken: $formToken, input: { questions: $questions }) {
      questions {
        id
      }
    }
  }
`;

export const updateFormHeader = gql`
  mutation updateFormHeader($formToken: String!, $title: String, $description: String) {
    update_form(formToken: $formToken, input: { title: $title, description: $description }) {
      title
      description
    }
  }
`;
