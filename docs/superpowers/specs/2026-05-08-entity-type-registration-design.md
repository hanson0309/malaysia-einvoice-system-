---
name: Entity Type Registration Flow
description: Add entity type selection (Individual/Company) to registration with conditional field changes and business activity dropdown
type: feature
date: 2026-05-08
---

# Entity Type Registration Flow Design

## Overview

Enhance the registration flow to support both individual and company registrations with conditional field rendering based on entity type selection. This includes adding a new initial step for entity type selection, modifying field labels and validations conditionally, and converting the business activity code to a searchable dropdown.

## Background

The current registration flow assumes all users are companies. However, the system needs to support individual users who have different registration requirements:
- Different identification numbers (IC/NRIC vs Company Registration Number)
- Different TIN formats (IG prefix for individuals vs C prefix for companies)
- Different field labels (Owner Name vs Company Name)

## Goals

1. Allow users to select their entity type (Individual or Company) before registration
2. Conditionally render appropriate fields based on entity type
3. Implement proper validation for each entity type
4. Convert business activity code to a searchable dropdown with 1000+ MSIC codes
5. Maintain a smooth user experience with clear labeling and validation

## Non-Goals

- Modifying backend API structure (assumes backend can handle entity_type field)
- Changing the overall registration flow beyond adding Step 0
- Implementing different pricing or features based on entity type

## Design

### User Flow

```
Sign In → [NEW] Step 0: Entity Type Selection → Step 1: Account Info → Step 2: Business Info → Step 3: Address Info → Success
```

#### Step 0: Entity Type Selection (NEW)
- **Purpose**: Determine if user is registering as Individual or Company
- **Fields**:
  - Radio button or card selection: "Individual" or "Company"
  - Brief description for each option
- **Validation**: Must select one option
- **Navigation**: "Next" button proceeds to Step 1

#### Step 1: Account Information (MODIFIED)
- **Conditional Field Changes**:
  - **Company**: "Company Name" (existing)
  - **Individual**: "Owner Name" (new label)
- **Other Fields** (unchanged):
  - Email Address
  - Password
  - Confirm Password
- **Validation**: Same as current, but field name changes based on entity type

#### Step 2: Business Information (MODIFIED)
- **Conditional Field Changes**:

  **Field 1: Registration Number**
  - **Company**: "Company Registration Number"
    - Format: 12-digit BRN (e.g., 202201234565)
    - Validation: Exactly 12 numeric digits
    - Placeholder: "202301234567"
  - **Individual**: "IC Number (NRIC)"
    - Format: Malaysian IC format (YYMMDD-PB-###G)
    - Validation: Malaysian IC format
    - Placeholder: "990101-01-1234"

  **Field 2: TIN Number**
  - **Individual**: 
    - Auto-prefix with "IG"
    - User enters exactly 11 digits
    - Display: "IG" + user input (e.g., IG12345678901)
    - Validation: Exactly 11 numeric digits
    - Placeholder: "12345678901"
    - Helper text: "TIN will be formatted as IG + 11 digits"
  - **Company**:
    - Flexible format for old and new TIN
    - New format: C + 10-11 digits ending with 0 (e.g., C12345678900)
    - Old format: C + 10-11 digits (e.g., C1234567890)
    - Validation: Must start with 'C' followed by 10-11 numeric digits
    - Placeholder: "C12345678900"
    - Helper text: "Format: C followed by 10-11 digits"

  **Field 3: Business Activity Code (MODIFIED)**
  - Convert from text input to searchable dropdown
  - Load all codes from `D:\work\cloud\cloud\src\Languages\msic.json`
  - Display format: "Code - Description"
    - Example: "46510 - Wholesale of computer hardware, software and peripherals"
  - Implement search/filter functionality
  - Validation: Must select a valid code
  - Same for both Individual and Company

  **Field 4: SST Registration Number**
  - Remains optional for both entity types
  - No changes to existing validation

#### Step 3: Address Information (UNCHANGED)
- No changes to this step

### Data Model Changes

**Form Data Structure**:
```typescript
interface RegistrationFormData {
  // NEW FIELD
  entity_type: 'individual' | 'company';
  
  // Step 1 - Account Info
  company_name: string; // Used for both company name and owner name
  email: string;
  password: string;
  confirmPassword: string;
  
  // Step 2 - Business Info
  company_registration_no: string; // Used for both BRN and IC number
  tin_number: string;
  business_activity_code: string;
  sst_registration_no: string;
  
  // Step 3 - Address Info
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  state_code: string;
}
```

### Component Structure

```
RegisterPage
├── ProgressIndicator (updated to show 4 steps)
├── RegisterStep0 (NEW - Entity Type Selection)
├── RegisterStep1 (modified - conditional labels)
├── RegisterStep2 (modified - conditional fields + dropdown)
└── RegisterStep3 (unchanged)
```

### Validation Rules

#### Step 0
- `entity_type`: Required, must be 'individual' or 'company'

#### Step 1
- `company_name` (or owner_name):
  - Required
  - Max 200 characters
  - Label changes based on entity_type

#### Step 2
- `company_registration_no` (or ic_number):
  - **For Company**:
    - Required
    - Exactly 12 numeric digits
    - Pattern: `/^\d{12}$/`
  - **For Individual**:
    - Required
    - Malaysian IC format
    - Pattern: `/^\d{6}-\d{2}-\d{4}$/`
    - Max 50 characters

- `tin_number`:
  - **For Individual**:
    - Required
    - Exactly 11 numeric digits (IG prefix added automatically)
    - Pattern: `/^\d{11}$/`
    - Stored as: "IG" + user_input
  - **For Company**:
    - Required
    - Must start with 'C' followed by 10-11 digits
    - Pattern: `/^C\d{10,11}$/`
    - Max 20 characters

- `business_activity_code`:
  - Required
  - Must be a valid MSIC code from the dropdown
  - Max 10 characters

- `sst_registration_no`:
  - Optional for both entity types
  - Max 50 characters

### UI/UX Considerations

1. **Step 0 Design**:
   - Use card-based selection for better visual hierarchy
   - Include icons for Individual (person icon) and Company (building icon)
   - Show brief description under each option
   - Highlight selected option clearly

2. **Conditional Field Labels**:
   - Smooth transition between steps
   - Clear labeling that matches entity type
   - Consistent styling across all steps

3. **TIN Number Input (Individual)**:
   - Show "IG" prefix as read-only text or label
   - Input field only accepts 11 digits
   - Display format: "IG" + input value
   - Helper text explains the format

4. **Business Activity Dropdown**:
   - Searchable/filterable dropdown (use library like react-select or custom implementation)
   - Show "Code - Description" format
   - Highlight search matches
   - Smooth scrolling for 1000+ options
   - Clear selection button

5. **Progress Indicator**:
   - Update to show 4 steps instead of 3
   - Step 0: "Entity Type"
   - Step 1: "Account"
   - Step 2: "Business"
   - Step 3: "Address"

### Technical Implementation Details

#### Component: RegisterStep0.tsx
```typescript
interface RegisterStep0Props {
  formData: {
    entity_type: 'individual' | 'company' | '';
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}
```

#### Component: RegisterStep1.tsx (Modified)
- Add `entity_type` prop
- Conditional label rendering:
  ```typescript
  const fieldLabel = entity_type === 'individual' ? 'Owner Name' : 'Company Name';
  ```

#### Component: RegisterStep2.tsx (Modified)
- Add `entity_type` prop
- Conditional field rendering for registration number and TIN
- Implement searchable dropdown for business activity code
- Load MSIC data from JSON file

#### Business Activity Dropdown Implementation
- Use react-select or similar library for searchable dropdown
- Load data from `msic.json` on component mount
- Format options: `{ value: code, label: `${code} - ${description}` }`
- Implement custom filter function for search
- Handle large dataset efficiently (virtualization if needed)

### Data Flow

1. User selects entity type in Step 0
2. Entity type stored in form state
3. Step 1 receives entity_type and renders conditional labels
4. Step 2 receives entity_type and renders conditional fields
5. Validation rules applied based on entity_type
6. Form submission includes entity_type field
7. Backend receives entity_type and processes accordingly

### Error Handling

1. **Invalid TIN Format**:
   - Individual: "TIN must be exactly 11 digits"
   - Company: "TIN must start with C followed by 10-11 digits"

2. **Invalid Registration Number**:
   - Individual: "Please enter a valid IC number (format: YYMMDD-PB-###G)"
   - Company: "Company registration number must be exactly 12 digits"

3. **Business Activity Code**:
   - "Please select a valid business activity code"

4. **Entity Type Not Selected**:
   - "Please select whether you are registering as an individual or company"

### Accessibility

- Proper ARIA labels for all form fields
- Keyboard navigation support for dropdown
- Screen reader announcements for conditional field changes
- Focus management when moving between steps
- Error messages associated with form fields

### Performance Considerations

1. **MSIC Data Loading**:
   - Load msic.json once on component mount
   - Cache the data in component state
   - Consider lazy loading if file size is large

2. **Dropdown Rendering**:
   - Implement virtualization for 1000+ options if performance issues arise
   - Debounce search input to avoid excessive filtering

3. **Form State Management**:
   - Minimal re-renders when entity_type changes
   - Efficient validation on field change

## Implementation Plan

### Phase 1: Core Structure
1. Create RegisterStep0 component for entity type selection
2. Update progress indicator to show 4 steps
3. Add entity_type to form data state
4. Update routing/step navigation logic

### Phase 2: Conditional Fields
1. Modify RegisterStep1 with conditional labels
2. Modify RegisterStep2 with conditional fields
3. Implement TIN auto-prefix logic for individuals
4. Update validation rules based on entity type

### Phase 3: Business Activity Dropdown
1. Load and parse msic.json data
2. Implement searchable dropdown component
3. Format options with code and description
4. Add search/filter functionality
5. Handle selection and validation

### Phase 4: Testing & Polish
1. Test all validation rules for both entity types
2. Test dropdown search functionality
3. Verify data submission format
4. Cross-browser testing
5. Accessibility audit
6. Performance testing with large dropdown

## Testing Strategy

### Unit Tests
- Validation functions for each entity type
- TIN formatting logic
- IC number validation
- Company registration number validation
- MSIC data loading and formatting

### Integration Tests
- Complete registration flow for individual
- Complete registration flow for company
- Step navigation with entity type selection
- Form data persistence across steps
- Dropdown search and selection

### E2E Tests
- Full registration journey for individual user
- Full registration journey for company user
- Error handling and validation messages
- Dropdown interaction and search

## Success Metrics

1. Users can successfully register as both individuals and companies
2. Validation errors are clear and helpful
3. Business activity dropdown is easy to search and use
4. No increase in registration abandonment rate
5. Form submission includes correct entity_type field

## Future Enhancements

1. Add entity type-specific features after registration
2. Different dashboard views based on entity type
3. Entity type-specific invoice templates
4. Bulk registration for companies with multiple branches
5. Integration with government APIs for IC/BRN verification

## Open Questions

1. Should we allow users to change entity type after registration?
2. Do we need to verify IC numbers or company registration numbers with external APIs?
3. Should individual users have access to all features that companies have?
4. Do we need to store additional metadata based on entity type?

## References

- Malaysian IC Number Format: YYMMDD-PB-###G
- Company Registration Number (BRN): 12-digit format
- TIN Format (Individual): IG + 11 digits
- TIN Format (Company): C + 10-11 digits
- MSIC Codes: D:\work\cloud\cloud\src\Languages\msic.json
