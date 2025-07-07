#!/bin/bash

# GitHub Issue Update Script for BlueLight Hub
# This script updates GitHub issues with type, milestone, and project assignments

# Configuration
REPO="bluelight-hub/app"
PROJECT_ID="PVT_kwDOCz4vfM4Ayy7o"
ALPHA_MILESTONE=1

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to determine issue type based on title and content
determine_issue_type() {
    local title="$1"
    local body="$2"
    
    # Task patterns
    if [[ "$title" =~ (Feature:|Tool:|Security Feature:|Refactor|Test) ]]; then
        echo "Task"
    # Feature patterns
    elif [[ "$title" =~ (Integration|Dashboard|Dokumentation|Export|Import) ]]; then
        echo "Feature"
    # Default to Feature for most cases
    else
        echo "Feature"
    fi
}

# Function to determine appropriate milestone
determine_milestone() {
    local title="$1"
    local body="$2"
    
    # Advanced features that should go to later milestones
    if [[ "$title" =~ (Maplibre|OpenFireMap|Kotlin|Performance|Optimization) ]]; then
        echo "0"  # No milestone for now, needs manual decision
    else
        echo "$ALPHA_MILESTONE"  # Default to Alpha 0.1
    fi
}

# Function to update a single issue
update_issue() {
    local issue_number="$1"
    local force_type="$2"
    local force_milestone="$3"
    
    echo -e "${YELLOW}Processing issue #$issue_number...${NC}"
    
    # Get issue details
    local issue_data=$(gh api "repos/$REPO/issues/$issue_number")
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to fetch issue #$issue_number${NC}"
        return 1
    fi
    
    local title=$(echo "$issue_data" | jq -r '.title')
    local body=$(echo "$issue_data" | jq -r '.body // ""')
    local node_id=$(echo "$issue_data" | jq -r '.node_id')
    local current_milestone=$(echo "$issue_data" | jq -r '.milestone.number // "none"')
    local current_type=$(echo "$issue_data" | jq -r '.type.name // "none"')
    
    echo "  Title: $title"
    
    # Determine type (use force_type if provided)
    local issue_type="${force_type:-$(determine_issue_type "$title" "$body")}"
    echo "  Type: $issue_type"
    
    # Determine milestone (use force_milestone if provided)
    local milestone="${force_milestone:-$(determine_milestone "$title" "$body")}"
    
    # Update milestone if needed
    if [ "$milestone" != "0" ] && [ "$current_milestone" == "none" ]; then
        echo "  Setting milestone to Alpha 0.1..."
        gh api "repos/$REPO/issues/$issue_number" \
            --method PATCH \
            -f milestone="$milestone" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓ Milestone set${NC}"
        else
            echo -e "  ${RED}✗ Failed to set milestone${NC}"
        fi
    elif [ "$milestone" == "0" ]; then
        echo "  ⚠️  Milestone needs manual decision"
    else
        echo "  ✓ Milestone already set"
    fi
    
    # Update type
    if [ "$current_type" == "none" ]; then
        echo "  Setting type to $issue_type..."
        gh api -X PATCH "repos/$REPO/issues/$issue_number" \
            --field type="$issue_type" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}✓ Type set${NC}"
        else
            echo -e "  ${RED}✗ Failed to set type${NC}"
        fi
    else
        echo "  ✓ Type already set: $current_type"
    fi
    
    # Link to project
    echo "  Linking to Project v1.0..."
    local result=$(gh api graphql -f query='
    mutation {
      addProjectV2ItemById(input: {
        projectId: "'$PROJECT_ID'"
        contentId: "'$node_id'"
      }) {
        item {
          id
        }
      }
    }' 2>&1)
    
    if [[ "$result" =~ "item" ]]; then
        echo -e "  ${GREEN}✓ Linked to project${NC}"
    elif [[ "$result" =~ "already exists" ]]; then
        echo "  ✓ Already linked to project"
    else
        echo -e "  ${RED}✗ Failed to link to project${NC}"
    fi
    
    echo ""
    sleep 0.5  # Rate limiting
}

# Function to process all issues
process_all_issues() {
    local start_from="${1:-29}"
    
    echo -e "${GREEN}Starting batch update from issue #$start_from${NC}\n"
    
    # Get all open issues
    local issues=$(gh api "repos/$REPO/issues?state=open&per_page=100&sort=created&direction=asc" | \
        jq -r '.[] | select(.number >= '$start_from') | .number')
    
    local total=$(echo "$issues" | wc -l | tr -d ' ')
    local current=0
    
    echo "Found $total issues to process"
    echo "=========================="
    echo ""
    
    for issue_number in $issues; do
        ((current++))
        echo "[$current/$total]"
        update_issue "$issue_number"
    done
    
    echo -e "${GREEN}Batch update completed!${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -i, --issue NUMBER      Update a single issue"
    echo "  -t, --type TYPE         Force issue type (Feature or Task)"
    echo "  -m, --milestone NUMBER  Force milestone number"
    echo "  -s, --start NUMBER      Start batch update from issue number (default: 29)"
    echo "  -a, --all               Process all open issues"
    echo ""
    echo "Examples:"
    echo "  $0 -i 30                     # Update single issue #30"
    echo "  $0 -i 30 -t Task            # Update issue #30 as Task"
    echo "  $0 -s 50                    # Batch update starting from issue #50"
    echo "  $0 -a                       # Update all open issues"
}

# Main script logic
main() {
    local single_issue=""
    local force_type=""
    local force_milestone=""
    local start_from="29"
    local process_all=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -i|--issue)
                single_issue="$2"
                shift 2
                ;;
            -t|--type)
                force_type="$2"
                shift 2
                ;;
            -m|--milestone)
                force_milestone="$2"
                shift 2
                ;;
            -s|--start)
                start_from="$2"
                shift 2
                ;;
            -a|--all)
                process_all=true
                start_from="1"
                shift
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check if gh is installed
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
        echo "Please install it from: https://cli.github.com/"
        exit 1
    fi
    
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}Error: Not authenticated with GitHub${NC}"
        echo "Please run: gh auth login"
        exit 1
    fi
    
    # Execute based on options
    if [ -n "$single_issue" ]; then
        update_issue "$single_issue" "$force_type" "$force_milestone"
    else
        process_all_issues "$start_from"
    fi
}

# Run main function
main "$@"