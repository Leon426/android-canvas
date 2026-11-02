# Customizable Components: first implementation contract

Status: accepted for the `customizable-components` branch.

## Product boundary

The first release targets Android applications built with Jetpack Compose and
Material 3 / Material 3 Expressive. It is not a general vector editor. Every
editable value must have an explicit canvas meaning and a deterministic Compose
translation.

## Data layers

1. Theme tokens define app-wide colour, type, shape, and motion choices.
2. Built-in parts represent official Material components.
3. Component definitions store reusable visual decisions for one built-in kind.
4. Component instances keep screen-specific content and behaviour and may
   override visual values from their definition.
5. Screens, groups, actions, and transitions describe the prototype.
6. An Agent Bundle combines the prompt, structured prototype, component
   library, assets, reference images, and acceptance criteria.

Definitions and instances are separate. Editing a definition updates every
instance unless that instance has an explicit override. Missing or incompatible
definitions must never make an older project impossible to open or render.

## Initial component scope

- Top app bar (Header)
- Bottom navigation
- FAB and extended FAB
- Button
- Card

The first style schema contains variant, size, per-edge radii, fill, icon fill,
text colour, and weight. State styling, slots, responsive rules, shadows, and
parameterised motion will be added through later schema versions rather than
unvalidated fields.

## Compatibility rules

- Component libraries have an explicit schema version.
- Legacy projects omit the library and remain valid.
- Definition identifiers are unique within a project.
- Inheritance must use the same built-in component kind and must not cycle.
- Instance overrides may contain style values only; content, navigation, and
  notes stay on the canvas item.
- The renderer receives a resolved ordinary item, keeping one rendering path.

## Accuracy contract

The product aims for high fidelity only for features represented in its schema.
Agent output will combine human-readable intent, machine-readable component and
layout data, reference renders, and acceptance checks. Unsupported behaviour is
reported explicitly instead of being described as an exact export.

## Delivery sequence

1. Versioned component model, validation, persistence, and inheritance.
2. Definition/instance resolution in canvas and preview.
3. Component Library panel and “save as component” flow.
4. Agent Bundle export.
5. Compose sample generation and screenshot comparison.
6. Advanced states, slots, responsive rules, and motion editor.

