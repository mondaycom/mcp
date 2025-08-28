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
          labelLimitCount
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
