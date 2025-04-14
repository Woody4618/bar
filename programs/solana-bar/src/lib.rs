use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("HHpyCo9M9ZX2bhiYyYznMagry6eGJZxykPEAes54o29S");

const SOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");

#[error_code]
pub enum ShotErrorCode {
    #[msg("InvalidTreasury")]
    InvalidTreasury,
    #[msg("ProductAlreadyExists")]
    ProductAlreadyExists,
    #[msg("ProductNotFound")]
    ProductNotFound,
    #[msg("InvalidMint")]
    InvalidMint,
    #[msg("InvalidAuthority")]
    InvalidAuthority,
}

#[program]
pub mod solana_bar {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, bar_name: String) -> Result<()> {
        ctx.accounts.receipts.bar_name = bar_name.clone();
        ctx.accounts.receipts.authority = *ctx.accounts.authority.key;
        Ok(())
    }

    pub fn add_product(
        ctx: Context<AddProduct>,
        bar_name: String,
        name: String,
        price: u64,
        decimals: u8,
        mint: Pubkey,
    ) -> Result<()> {
        // Verify the caller is the authority
        require!(
            *ctx.accounts.authority.key == ctx.accounts.receipts.authority,
            ShotErrorCode::InvalidAuthority
        );

        // Check if product with same mint already exists
        for product in &ctx.accounts.receipts.products {
            if product.mint == mint {
                return Err(ShotErrorCode::ProductAlreadyExists.into());
            }
        }

        // Add new product
        ctx.accounts.receipts.products.push(Products {
            name,
            price,
            decimals,
            mint,
        });

        Ok(())
    }

    pub fn buy_shot(ctx: Context<BuyShot>, bar_name: String, product_name: String) -> Result<()> {
        // Find the product and verify the mint matches
        let product = ctx
            .accounts
            .receipts
            .products
            .iter()
            .find(|p| p.name == product_name)
            .ok_or(ShotErrorCode::ProductNotFound)?;

        require!(
            product.mint == ctx.accounts.mint.key(),
            ShotErrorCode::InvalidMint
        );

        let price = product.price;
        let decimals = product.decimals;
        let name = product.name.clone();
        let is_sol = product.mint == SOL_MINT;

        // Add a new receipt to the receipts account.
        let receipt_id = ctx.accounts.receipts.total_shots_sold;
        ctx.accounts.receipts.receipts.push(Receipt {
            buyer: *ctx.accounts.signer.key,
            was_delivered: false,
            price,
            timestamp: Clock::get()?.unix_timestamp,
            receipt_id,
            table_number: 1,
            product_name: name,
        });

        let len = ctx.accounts.receipts.receipts.len();
        if len >= 10 {
            ctx.accounts.receipts.receipts.remove(0);
        }

        // Increment the total shots sold.
        ctx.accounts.receipts.total_shots_sold = ctx
            .accounts
            .receipts
            .total_shots_sold
            .checked_add(1)
            .unwrap();

        // If mint is SOL, use system program transfer
        if is_sol {
            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.signer.to_account_info().clone(),
                    to: ctx.accounts.authority.to_account_info().clone(),
                },
            );
            system_program::transfer(cpi_context, price)?;
        } else {
            // Otherwise use token transfer
            let cpi_accounts = TransferChecked {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

            token::transfer_checked(cpi_context, price, decimals)?;
        }

        Ok(())
    }

    pub fn mark_shot_as_delivered(
        ctx: Context<MarkShotAsDelivered>,
        _bar_name: String,
        recipe_id: u64,
    ) -> Result<()> {
        msg!("Marked shot as delivered");
        for i in 0..ctx.accounts.receipts.receipts.len() {
            msg!("Marked shot as delivered  {}", i);
            if ctx.accounts.receipts.receipts[i].receipt_id == recipe_id {
                msg!("Marked shot as delivered {} {} ", recipe_id, i);
                ctx.accounts.receipts.receipts[i].was_delivered = true;
            }
        }
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bar_name: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 4 + 4 + (4 + 32 + 8 + 1 + 32) * 10 + (4 + 32 + 1 + 8 + 8 + 4 + 32) * 10,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, name: String, price: u64, decimals: u8, mint: Pubkey)]
pub struct AddProduct<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, product_name: String)]
pub struct BuyShot<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub authority: SystemAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(bar_name: String, recipe_id: u64)]
pub struct MarkShotAsDelivered<'info> {
    #[account(
        mut,
        seeds = [b"receipts", bar_name.as_bytes()],
        bump
    )]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account()]
pub struct Receipts {
    pub receipts: Vec<Receipt>,
    pub total_shots_sold: u64,
    pub bar_name: String,
    pub authority: Pubkey,
    pub products: Vec<Products>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Products {
    pub price: u64,
    pub decimals: u8,
    pub mint: Pubkey,
    pub name: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Receipt {
    pub receipt_id: u64,
    pub buyer: Pubkey,
    pub was_delivered: bool,
    pub price: u64,
    pub timestamp: i64,
    pub table_number: u8,
    pub product_name: String,
}
