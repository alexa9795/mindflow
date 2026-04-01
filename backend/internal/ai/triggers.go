package ai

import "strings"

// Triggers is the list of phrases that indicate crisis, self-harm, or abuse.
var Triggers = []string{
	"kill myself", "end my life", "don't want to live", "want to die",
	"better off dead", "no reason to live", "suicide", "suicidal",
	"take my own life", "cut myself", "hurt myself", "self harm",
	"self-harm", "burning myself", "hitting myself", "starving myself",
	"he hits me", "she hits me", "they hit me", "being abused",
	"scared of him", "scared of her", "won't let me leave",
	"controls me", "threatens me", "want to hurt", "want to kill",
	"going to hurt", "going to kill", "hurt someone", "kill someone",
	"can't go on", "can't take it anymore", "nobody would miss me",
	"everyone would be better without me",
}

// CheckTriggers reports whether any trigger phrase appears in content (case-insensitive).
func CheckTriggers(content string) bool {
	return findTrigger(content) != ""
}

// findTrigger returns the first matching trigger phrase, or empty string if none.
func findTrigger(content string) string {
	lower := strings.ToLower(content)
	for _, t := range Triggers {
		if strings.Contains(lower, t) {
			return t
		}
	}
	return ""
}
