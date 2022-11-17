import React, { useReducer } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Controller } from '../controller';
import { Control } from '../types';
import { useFieldArray } from '../useFieldArray';
import { useForm } from '../useForm';
import { FormProvider } from '../useFormContext';
import { useFormState } from '../useFormState';
import deepEqual from '../utils/deepEqual';

describe('useFormState', () => {
  it('should render correct form state with isDirty, dirty, touched', () => {
    let count = 0;
    const Test = ({
      control,
    }: {
      control: Control<{
        test: string;
      }>;
    }) => {
      const { isDirty, dirtyFields, touchedFields } = useFormState({
        control,
      });

      return (
        <>
          <div>{isDirty ? 'isDirty' : ''}</div>
          <div>{dirtyFields['test'] ? 'dirty field' : ''}</div>
          <div>{touchedFields['test'] ? 'isTouched' : ''}</div>
        </>
      );
    };

    const Component = () => {
      const { register, control } = useForm<{
        test: string;
      }>();

      count++;

      return (
        <div>
          <input aria-label="test" {...register('test')} />
          <Test control={control} />
        </div>
      );
    };

    render(<Component />);

    fireEvent.input(screen.getByLabelText('test'), {
      target: {
        value: 'test',
      },
    });

    expect(screen.getByText('isDirty')).toBeVisible();
    expect(screen.getByText('dirty field')).toBeVisible();
    expect(count).toEqual(1);

    fireEvent.blur(screen.getByLabelText('test'));
    expect(screen.getByText('isTouched')).toBeVisible();
    expect(count).toEqual(1);
  });

  it('should render correct isolated errors message', async () => {
    let count = 0;
    const Test = ({ control }: { control: Control }) => {
      const { errors, isValid } = useFormState({
        control,
      });

      return (
        <>
          <div>{errors['test'] ? 'error' : 'valid'}</div>
          <div>{isValid ? 'yes' : 'no'}</div>
        </>
      );
    };

    const Component = () => {
      const { register, control } = useForm({
        mode: 'onChange',
      });

      count++;

      return (
        <div>
          <input aria-label="test" {...register('test', { minLength: 5 })} />
          <Test control={control} />
        </div>
      );
    };
    render(<Component />);

    fireEvent.input(screen.getByLabelText('test'), {
      target: {
        value: 'test',
      },
    });

    expect(await screen.findByText('error')).toBeVisible();
    expect(screen.getByText('no')).toBeVisible();

    fireEvent.input(screen.getByLabelText('test'), {
      target: {
        value: 'testtest',
      },
    });

    expect(await screen.findByText('valid')).toBeVisible();
    expect(screen.getByText('yes')).toBeVisible();

    expect(count).toEqual(1);
  });

  it('should update formState separately with useFormState', async () => {
    let count = 0;
    let testCount = 0;
    let test1Count = 0;

    const Test1 = ({ control }: { control: Control }) => {
      const { isDirty, dirtyFields } = useFormState({
        control,
      });

      testCount++;

      return (
        <>
          <div>
            {dirtyFields['test'] ? 'hasDirtyField' : 'notHasDirtyField'}
          </div>
          <div>{isDirty ? 'isDirty' : 'notDirty'}</div>
        </>
      );
    };

    const Test = ({ control }: { control: Control }) => {
      const { touchedFields } = useFormState({
        control,
      });

      test1Count++;

      return (
        <>
          <div>{touchedFields['test'] ? 'isTouched' : 'notTouched'}</div>
        </>
      );
    };

    const Component = () => {
      const { register, control } = useForm({
        mode: 'onChange',
      });

      count++;

      return (
        <div>
          <input aria-label="test" {...register('test', { minLength: 5 })} />
          <Test control={control} />
          <Test1 control={control} />
        </div>
      );
    };

    render(<Component />);

    fireEvent.input(screen.getByLabelText('test'), {
      target: {
        value: 'test',
      },
    });

    expect(await screen.findByText('hasDirtyField')).toBeVisible();
    expect(screen.getByText('isDirty')).toBeVisible();

    expect(count).toEqual(1);
    expect(testCount).toEqual(2);
    expect(test1Count).toEqual(1);

    fireEvent.blur(screen.getByLabelText('test'));
    expect(screen.getByText('isTouched')).toBeVisible();

    expect(count).toEqual(1);
    expect(testCount).toEqual(3);
    expect(test1Count).toEqual(2);

    fireEvent.input(screen.getByLabelText('test'), {
      target: {
        value: '',
      },
    });

    expect(count).toEqual(1);
    expect(testCount).toEqual(3);
    expect(test1Count).toEqual(2);
  });

  it('should render correct submit state', async () => {
    let count = 0;
    const Test = ({ control }: { control: Control }) => {
      const { isSubmitted, submitCount } = useFormState({
        control,
      });

      return (
        <>
          <div>{isSubmitted ? 'isSubmitted' : ''}</div>
          <div>{submitCount}</div>
        </>
      );
    };

    const Component = () => {
      const { control, handleSubmit } = useForm();

      count++;

      return (
        <form onSubmit={handleSubmit(() => {})}>
          <Test control={control} />
          <button>Submit</button>
        </form>
      );
    };

    render(<Component />);

    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('isSubmitted')).toBeVisible();
    expect(screen.getByText('1')).toBeVisible();

    expect(count).toEqual(1);
  });

  it('should only re-render when subscribed field name updated', async () => {
    let count = 0;

    type FormValues = {
      firstName: string;
      lastName: string;
    };

    const Test = ({ control }: { control: Control<FormValues> }) => {
      const { errors } = useFormState({
        control,
        name: 'firstName',
      });

      count++;

      return <>{errors?.firstName?.message}</>;
    };

    const Component = () => {
      const { control, register } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
          firstName: 'a',
          lastName: 'b',
        },
      });

      return (
        <form>
          <Test control={control} />
          <input
            {...register('firstName', { required: true })}
            placeholder={'firstName'}
          />
          <input {...register('lastName')} />
        </form>
      );
    };

    render(<Component />);

    fireEvent.change(screen.getByPlaceholderText('firstName'), {
      target: {
        value: '',
      },
    });

    await waitFor(() => expect(count).toEqual(2));
  });

  it('should not re-render when subscribed field name is not included', async () => {
    let count = 0;

    type FormValues = {
      firstName: string;
      lastName: string;
    };

    const Test = ({ control }: { control: Control<FormValues> }) => {
      const { errors } = useFormState({
        control,
        name: 'lastName',
      });

      count++;

      return <>{errors?.lastName?.message}</>;
    };

    const Component = () => {
      const { control, register } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
          firstName: 'a',
          lastName: 'b',
        },
      });

      return (
        <form>
          <Test control={control} />
          <input
            {...register('firstName', { required: true })}
            placeholder={'firstName'}
          />
          <input {...register('lastName')} />
        </form>
      );
    };

    render(<Component />);

    fireEvent.change(screen.getByPlaceholderText('firstName'), {
      target: {
        value: '',
      },
    });

    expect(count).toEqual(1);
  });

  it('should only re-render when subscribed field names updated', async () => {
    let count = 0;

    type FormValues = {
      firstName: string;
      lastName: string;
      age: number;
    };

    const Test = ({ control }: { control: Control<FormValues> }) => {
      const { errors } = useFormState({
        control,
        name: ['firstName', 'lastName'],
      });

      count++;

      return <>{errors?.firstName?.message}</>;
    };

    const Component = () => {
      const { control, register } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
          firstName: 'a',
          lastName: 'b',
        },
      });

      return (
        <form>
          <Test control={control} />
          <input
            {...register('firstName', { required: true })}
            placeholder={'firstName'}
          />
          <input
            {...register('lastName', { required: true })}
            placeholder={'lastName'}
          />
          <input
            {...register('age', { valueAsNumber: true, required: true })}
            type="number"
          />
        </form>
      );
    };

    render(<Component />);

    fireEvent.change(screen.getByPlaceholderText('firstName'), {
      target: {
        value: '',
      },
    });

    fireEvent.change(screen.getByPlaceholderText('lastName'), {
      target: {
        value: '',
      },
    });

    await waitFor(() => expect(count).toEqual(2));
  });

  it('should only re-render when subscribed field names updated', async () => {
    let count = 0;

    type FormValues = {
      firstName: string;
      lastName: string;
      age: number;
    };

    const Test = ({ control }: { control: Control<FormValues> }) => {
      const { errors } = useFormState({
        control,
        name: ['age', 'lastName'],
      });

      count++;

      return <>{errors?.firstName?.message}</>;
    };

    const Component = () => {
      const { control, register } = useForm<FormValues>({
        mode: 'onChange',
        defaultValues: {
          firstName: 'a',
          lastName: 'b',
        },
      });

      return (
        <form>
          <Test control={control} />
          <input
            {...register('firstName', { required: true })}
            placeholder={'firstName'}
          />
          <input {...register('lastName')} placeholder={'lastName'} />
          <input
            {...register('age', { valueAsNumber: true, required: true })}
            type="number"
          />
        </form>
      );
    };

    render(<Component />);

    fireEvent.change(screen.getByPlaceholderText('firstName'), {
      target: {
        value: '',
      },
    });

    expect(count).toEqual(1);
  });

  it('should be able to stop the formState subscription', async () => {
    type FormValues = {
      test: string;
    };

    function Child({ control }: { control: Control<FormValues> }) {
      const [disabled, setDisabled] = React.useState(true);
      const { errors } = useFormState({
        control,
        name: 'test',
        disabled,
      });

      return (
        <div>
          {errors.test && <p>error</p>}
          <button onClick={() => setDisabled(!disabled)}>toggle</button>
        </div>
      );
    }

    const App = () => {
      const { trigger, register, control } = useForm<FormValues>();

      return (
        <div>
          <input {...register('test', { required: true })} />
          <Child control={control} />
          <button
            onClick={() => {
              trigger();
            }}
          >
            trigger
          </button>
        </div>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));

    expect(screen.queryByText('error')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));

    expect(await screen.findByText('error')).toBeVisible();
  });

  it('should not start early subscription and throw warning at strict mode', async () => {
    type FormValues = { test: { data: string }[] };

    function FieldArray() {
      const { reset, control } = useForm<FormValues>({
        defaultValues: { test: [] },
      });
      const { fields, append } = useFieldArray({ control, name: 'test' });
      return (
        <div>
          {fields.map((field, index) => (
            <div key={field.id}>
              <Controller
                control={control}
                name={`test.${index}.data` as const}
                render={({ field }) => <input {...field} />}
              />
            </div>
          ))}
          <button
            onClick={() =>
              append({
                data: 'data',
              })
            }
          >
            add
          </button>
          <button onClick={() => reset({})}>reset</button>
        </div>
      );
    }

    const App = () => {
      return (
        <React.StrictMode>
          <FieldArray />
        </React.StrictMode>
      );
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'add' }));

    fireEvent.click(screen.getByRole('button', { name: 'reset' }));

    fireEvent.click(screen.getByRole('button', { name: 'add' }));

    expect(await screen.findAllByRole('textbox')).toHaveLength(1);
  });

  it('should subscribe to exact form state update', () => {
    const App = () => {
      const { control, register } = useForm();
      const [exact, setExact] = React.useState(true);
      const { touchedFields } = useFormState({
        name: 'test',
        control,
        exact,
      });

      return (
        <div>
          <input {...register('testData')} />
          <p>{touchedFields.testData && 'touched'}</p>

          <button
            onClick={() => {
              setExact(false);
            }}
          >
            toggle
          </button>
        </div>
      );
    };

    render(<App />);

    fireEvent.focus(screen.getByRole('textbox'));

    fireEvent.blur(screen.getByRole('textbox'));

    expect(screen.queryByText('touched')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    fireEvent.focus(screen.getByRole('textbox'));

    fireEvent.blur(screen.getByRole('textbox'));

    expect(screen.getByText('touched')).toBeVisible();
  });

  it('should be able to access defaultValues', () => {
    type FormValues = {
      firstName: string;
      lastName: string;
    };

    const defaultValues = {
      firstName: 'a',
      lastName: 'b',
    };

    const Test = ({ control }: { control: Control<FormValues> }) => {
      const formState = useFormState({
        control,
      });

      return (
        <p>
          {deepEqual(formState.defaultValues, defaultValues) ? 'yes' : 'no'}
        </p>
      );
    };

    const Component = () => {
      const { control } = useForm<FormValues>({
        defaultValues,
      });

      return <Test control={control} />;
    };

    render(<Component />);

    expect(screen.getByText('yes')).toBeVisible();
  });

  function DirtyMessage() {
    const { isDirty } = useFormState();

    return <p>Dirty form: {isDirty.toString()}</p>;
  }

  function ArticleTest() {
    const [showDirty, toggleShowDirty] = useReducer((prev) => !prev, false);
    const formData = useForm({
      defaultValues: {
        firstname: '',
        lastname: '',
      },
    });

    return (
      <div>
        <p>
          Sandbox to show problem when there is too much optimization and not
          mutating references.
        </p>
        <p>
          You can see the code problem in the{' '}
          <a
            href="https://github.com/react-hook-form/react-hook-form/blob/c69e9b9678877ab532660cc08c31d236591a3664/src/logic/createFormControl.ts#L284"
            target="_blank"
            rel="noreferrer"
          >
            React Hook Form codebase
          </a>
        </p>
        <p>To see the problem:</p>
        <ul>
          <li>type something in a field</li>
          <li>show the dirty message by clicking</li>
        </ul>

        <div className="alert">
          <span className="title">Note:</span>
          <p>
            Once you have subscribe to with `isDirty` it will be always updated
            even if you do not display the message anymore
          </p>
        </div>

        <button type="button" onClick={toggleShowDirty}>
          {showDirty ? 'Hide dirty message' : 'Show dirty message'}
        </button>
        <FormProvider {...formData}>
          {showDirty && <DirtyMessage />}
          <form onSubmit={formData.handleSubmit(() => {})}>
            <label>
              Firstname
              <input type="text" {...formData.register('firstname')} />
            </label>
            <label>
              Lastname
              <input type="text" {...formData.register('lastname')} />
            </label>
            <button type="submit">Submit</button>
          </form>
        </FormProvider>
        <p>
          Link to my article{' '}
          <a
            href="https://dev.to/romaintrotard/react-hook-form-a-unique-implementation-5aec-temp-slug-6523987"
            target="_blank"
            rel="noreferrer"
          >
            React Hook Form: a unique implementation
          </a>
        </p>
      </div>
    );
  }

  it('should work right', () => {
    render(<ArticleTest />);

    const showButton = screen.getByText('Show dirty message');

    fireEvent.change(screen.getByLabelText('Firstname'), {
      target: { value: 'Bob' },
    });

    fireEvent.click(showButton);

    expect(screen.getByText('Dirty form: true'));
  });
});
