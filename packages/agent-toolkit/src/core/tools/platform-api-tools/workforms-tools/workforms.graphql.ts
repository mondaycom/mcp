import { gql } from 'graphql-request';

// Create a new monday form (API version 2025-10)
export const createForm = gql`
  mutation createForm(
    $destination_workspace_id: Float!
    $destination_folder_id: Float
    $destination_folder_name: String
    $board_kind: BoardKind
    $destination_name: String
    $board_owner_ids: [Float!]
    $board_owner_team_ids: [Float!]
    $board_subscriber_ids: [Float!]
    $board_subscriber_teams_ids: [Float!]
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
        id
        type
        visible
        title
        description
        required
        showIfRules
        options {
          label
        }
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
      features {
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
      appearance {
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
      accessibility {
        language
        logoAltText
      }
      tags {
        id
        name
        value
        columnId
      }
    }
  }
`;

export const deleteFormQuestion = gql`
  mutation deleteFormQuestion($formToken: String!, $questionId: String!) {
    delete_question(formToken: $formToken, questionId: $questionId)
  }
`;

export const createFormQuestion = gql`
  mutation createFormQuestion($formToken: String!, $question: CreateQuestionInput!) {
    create_form_question(formToken: $formToken, question: $question) {
      id
      type
      title
      description
      visible
      required
      options {
        label
      }
      settings {
        checkedByDefault
        defaultCurrentDate
        display
        includeTime
        locationAutofilled
        optionsOrder
        prefixAutofilled
        prefixPredefined {
          enabled
          prefix
        }
        skipValidation
        prefill {
          enabled
          source
          lookup
        }
      }
    }
  }
`;

export const updateFormQuestion = gql`
  mutation updateFormQuestion($formToken: String!, $questionId: String!, $question: UpdateQuestionInput!) {
    update_form_question(formToken: $formToken, questionId: $questionId, question: $question) {
      id
      type
      title
      description
      visible
      required
      options {
        label
      }
      settings {
        checkedByDefault
        defaultCurrentDate
        display
        includeTime
        locationAutofilled
        optionsOrder
        prefixAutofilled
        prefixPredefined {
          enabled
          prefix
        }
        skipValidation
        prefill {
          enabled
          source
          lookup
        }
      }
    }
  }
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
      appearance {
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
      accessibility {
        language
        logoAltText
      }
    }
  }
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
      id
      name
      value
      columnId
    }
  }
`;

export const updateFormTag = gql`
  mutation updateFormTag($formToken: String!, $tagId: String!, $tag: UpdateFormTagInput!) {
    update_form_tag(formToken: $formToken, tagId: $tagId, tag: $tag)
  }
`;
